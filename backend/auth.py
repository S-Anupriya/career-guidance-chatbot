
import os
import re
import json
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


# Get JWT secret key with safe fallback for seamless startup
def get_jwt_secret():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        return "careerpath-future-forge-jwt-default-secret-key-2025"
    return secret


# Registration model
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


# Login model
class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


# Profile update model
class ProfileUpdateRequest(BaseModel):
    course: str = Field(default="", max_length=100)
    institution: str = Field(default="", max_length=150)
    graduation_year: int | None = Field(
        default=None, ge=2000, le=2100
    )
    interests: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=30)
    preferred_domains: list[str] = Field(
        default_factory=list, max_length=15
    )


DISPOSABLE_EMAIL_DOMAINS = {
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "throwawaymail.com",
    "fakeinbox.com",
    "yopmail.com",
    "trashmail.com",
    "dispostable.com",
    "sharklasers.com",
    "getairmail.com",
}


# Validate email format and check against disposable providers
def validate_email(email: str) -> tuple[bool, str]:
    if not re.fullmatch(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
        return False, "Please enter a valid email address (e.g. student@college.edu or name@gmail.com)."

    parts = email.split("@")
    if len(parts) != 2:
        return False, "Malformed email address."

    domain = parts[1].lower()
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        return False, "Temporary or disposable email domains are not allowed."

    tld = domain.split(".")[-1]
    if len(tld) < 2:
        return False, "Invalid email domain extension."

    return True, ""


# Validate password strength (min 8 chars, uppercase, lowercase, digit, special char)
def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numeric digit (0-9)."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)."
    return True, ""


# Register student
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_student(request: RegisterRequest):

    name = request.name.strip()
    email = request.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid student name (at least 2 characters)."
        )

    is_valid_email, email_err = validate_email(email)
    if not is_valid_email:
        raise HTTPException(status_code=400, detail=email_err)

    is_strong_pw, pw_err = validate_password_strength(request.password)
    if not is_strong_pw:
        raise HTTPException(status_code=400, detail=pw_err)

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


def format_student_profile(student_row: sqlite3.Row | dict) -> dict:
    """Format student row into dictionary with parsed JSON list fields and stripped password."""
    profile = dict(student_row)
    profile.pop("password_hash", None)
    for field in ("interests", "skills", "preferred_domains"):
        raw = profile.get(field)
        if isinstance(raw, list):
            continue
        try:
            profile[field] = json.loads(raw or "[]")
        except (json.JSONDecodeError, TypeError):
            profile[field] = []
    return profile


# Create JWT access token
def create_access_token(student_id: int) -> str:

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

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


# Login student
@router.post("/login")
def login_student(request: LoginRequest):

    email = request.email.strip().lower()

    is_valid_email, email_err = validate_email(email)
    if not is_valid_email:
        raise HTTPException(
            status_code=400,
            detail=email_err
        )

    connection = get_connection()

    try:
        student = connection.execute(
            """
            SELECT id, name, email, password_hash,
                   course, institution, graduation_year,
                   interests, skills, preferred_domains
            FROM students
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

    finally:
        connection.close()

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
        "student": format_student_profile(student)
    }


# Get currently authenticated student
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
            SELECT id, name, email, course, institution,
                   graduation_year, interests, skills,
                   preferred_domains
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

    return format_student_profile(student)


security_optional = HTTPBearer(auto_error=False)


# Get optionally authenticated student without throwing 401
def get_optional_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional)
) -> dict | None:
    if not credentials or not credentials.credentials:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM]
        )
        student_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        return None

    connection = get_connection()
    try:
        student = connection.execute(
            """
            SELECT id, name, email, course, institution,
                   graduation_year, interests, skills,
                   preferred_domains
            FROM students
            WHERE id = ?
            """,
            (student_id,)
        ).fetchone()
    finally:
        connection.close()

    if not student:
        return None

    return format_student_profile(student)


# Get student profile
@router.get("/me")
def get_my_profile(
    current_student: dict = Depends(get_current_student)
):

    return {
        "message": "Authentication successful.",
        "student": current_student
    }


# Update student profile
@router.put("/profile")
def update_student_profile(
    request: ProfileUpdateRequest,
    current_student: dict = Depends(get_current_student)
):

    def clean_list(items: list[str], maximum: int) -> list[str]:

        cleaned = []

        for item in items:
            value = item.strip()

            if value and value not in cleaned:
                cleaned.append(value)

            if len(cleaned) >= maximum:
                break

        return cleaned

    course = request.course.strip()
    institution = request.institution.strip()

    interests = clean_list(request.interests, 20)
    skills = clean_list(request.skills, 30)
    domains = clean_list(request.preferred_domains, 15)

    connection = get_connection()

    try:
        connection.execute(
            """
            UPDATE students
            SET course = ?,
                institution = ?,
                graduation_year = ?,
                interests = ?,
                skills = ?,
                preferred_domains = ?
            WHERE id = ?
            """,
            (
                course or None,
                institution or None,
                request.graduation_year,
                json.dumps(interests),
                json.dumps(skills),
                json.dumps(domains),
                current_student["id"]
            )
        )

        connection.commit()

        updated = connection.execute(
            """
            SELECT id, name, email, course, institution,
                   graduation_year, interests, skills,
                   preferred_domains
            FROM students
            WHERE id = ?
            """,
            (current_student["id"],)
        ).fetchone()

        return {
            "message": "Student profile updated successfully.",
            "student": format_student_profile(updated)
        }

    except sqlite3.Error:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update student profile."
        )

    finally:
        connection.close()
