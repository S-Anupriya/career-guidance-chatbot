import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pwdlib import PasswordHash

from database import get_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hasher = PasswordHash.recommended()
security = HTTPBearer()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def get_jwt_secret():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing. Add it to backend/.env."
        )
    return secret


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def validate_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_student(request: RegisterRequest):
    name = request.name.strip()
    email = request.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid name."
        )

    if not validate_email(email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address."
        )

    password_hash = password_hasher.hash(request.password)
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO students (name, email, password_hash)
            VALUES (?, ?, ?)
            """,
            (name, email, password_hash)
        )
        connection.commit()

        return {
            "message": "Registration successful!",
            "student": {
                "id": cursor.lastrowid,
                "name": name,
                "email": email
            }
        }

    except sqlite3.IntegrityError:
        connection.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    except sqlite3.Error:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to complete registration."
        )

    finally:
        connection.close()


def create_access_token(student_id: int) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(student_id),
        "iat": now,
        "exp": expires_at
    }

    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=JWT_ALGORITHM
    )


@router.post("/login")
def login_student(request: LoginRequest):
    email = request.email.strip().lower()

    if not validate_email(email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address."
        )

    connection = get_connection()

    try:
        student = connection.execute(
            """
            SELECT id, name, email, password_hash
            FROM students
            WHERE email = ?
            """,
            (email,)
        ).fetchone()
    finally:
        connection.close()

    # Use the same message for unknown email and wrong password.
    if not student or not password_hasher.verify(
        request.password,
        student["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token(student["id"])

    return {
        "message": "Login successful!",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "student": {
            "id": student["id"],
            "name": student["name"],
            "email": student["email"]
        }
    }


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM]
        )

        student_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    connection = get_connection()

    try:
        student = connection.execute(
            """
            SELECT id, name, email, course, institution, graduation_year
            FROM students
            WHERE id = ?
            """,
            (student_id,)
        ).fetchone()
    finally:
        connection.close()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student account not found."
        )

    return dict(student)


@router.get("/me")
def get_my_profile(
    current_student: dict = Depends(get_current_student)
):
    return {
        "message": "Authentication successful.",
        "student": current_student
    }
