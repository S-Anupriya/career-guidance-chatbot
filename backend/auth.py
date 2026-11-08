import os
import re
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from database import get_connection, reset_database, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer()

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7-day token for seamless student & dev sessions


def get_jwt_secret():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        return "careerpath-future-forge-jwt-default-secret-key-2025"
    return secret


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: Optional[str] = Field(default=None, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdateRequest(BaseModel):
    course: str = Field(default="", max_length=100)
    institution: str = Field(default="", max_length=150)
    graduation_year: int | None = Field(default=None, ge=2000, le=2100)
    interests: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=30)
    preferred_domains: list[str] = Field(default_factory=list, max_length=15)


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
    "temp-mail.org",
    "mohmal.com",
    "burnermail.io",
}


def validate_email(email: str) -> tuple[bool, str]:
    if not email:
        return False, "Email address is required."

    if " " in email:
        return False, "Email address cannot contain spaces."

    if not re.fullmatch(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
        return False, "Invalid email format. Must follow standard format (e.g. name@gmail.com, student@college.ac.in, name@gov.in)."

    parts = email.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return False, "Malformed email address structure."

    username, domain = parts[0], parts[1].lower()

    if ".." in domain or domain.startswith("-") or domain.endswith("-"):
        return False, "Invalid email domain structure."

    if domain in DISPOSABLE_EMAIL_DOMAINS:
        return False, "Temporary or disposable email domains are strictly prohibited."

    tld = domain.split(".")[-1]
    if len(tld) < 2 or not tld.isalpha():
        return False, "Invalid top-level domain extension."

    return True, ""


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

    if request.confirm_password is not None and request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify your repeated password."
        )

    is_strong_pw, pw_err = validate_password_strength(request.password)
    if not is_strong_pw:
        raise HTTPException(status_code=400, detail=pw_err)

    password_hash = hash_password(request.password)

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO students (name, email, password_hash, role)
            VALUES (?, ?, ?, 'student')
            """,
            (name, email, password_hash)
        )
        connection.commit()

        return {
            "message": "Registration successful!",
            "student": {
                "id": cursor.lastrowid,
                "name": name,
                "email": email,
                "role": "student"
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
    if "role" not in profile:
        profile["role"] = "admin" if profile.get("email") == "blackfeatheractual@proton.me" else "student"
    for field in ("interests", "skills", "preferred_domains"):
        raw = profile.get(field)
        if isinstance(raw, list):
            continue
        try:
            profile[field] = json.loads(raw or "[]")
        except (json.JSONDecodeError, TypeError):
            profile[field] = []
    return profile


def create_access_token(student_id: int) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(student_id),
        "iat": now,
        "exp": expires_at
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


@router.post("/login")
def login_student(request: LoginRequest):
    email = request.email.strip().lower()

    is_valid_email, email_err = validate_email(email)
    if not is_valid_email:
        raise HTTPException(status_code=400, detail=email_err)

    connection = get_connection()
    try:
        student = connection.execute(
            """
            SELECT id, name, email, password_hash, role,
                   course, institution, graduation_year,
                   interests, skills, preferred_domains
            FROM students
            WHERE email = ?
            """,
            (email,)
        ).fetchone()
    finally:
        connection.close()

    if not student or not verify_password(request.password, student["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Seamless zero-overhead upgrade of legacy argon2 hash to PBKDF2
    if not student["password_hash"].startswith("pbkdf2:"):
        try:
            upgraded_hash = hash_password(request.password)
            up_conn = get_connection()
            up_conn.execute("UPDATE students SET password_hash = ? WHERE id = ?", (upgraded_hash, student["id"]))
            up_conn.commit()
            up_conn.close()
        except Exception:
            pass

    token = create_access_token(student["id"])

    return {
        "message": "Login successful!",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "student": format_student_profile(student)
    }


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
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
            SELECT id, name, email, role, course, institution,
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


def get_optional_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional)
) -> dict | None:
    if not credentials or not credentials.credentials:
        return None

    try:
        payload = jwt.decode(credentials.credentials, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        student_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        return None

    connection = get_connection()
    try:
        student = connection.execute(
            """
            SELECT id, name, email, role, course, institution,
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


@router.get("/me")
def get_my_profile(current_student: dict = Depends(get_current_student)):
    return {
        "message": "Authentication successful.",
        "student": current_student
    }


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
            SELECT id, name, email, role, course, institution,
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


# =========================================================================
# DEVELOPER / ADMIN PORTAL ENDPOINTS (Restricted to blackfeatheractual@proton.me)
# =========================================================================

class AdminPasswordReset(BaseModel):
    email: str
    new_password: str


class AdminCreateUser(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"


def require_admin(current_student: dict = Depends(get_current_student)) -> dict:
    if current_student.get("email") != "blackfeatheractual@proton.me" and current_student.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer administrative access required."
        )
    return current_student


@router.get("/admin/users")
def get_all_users_admin(admin: dict = Depends(require_admin)):
    """Fetch all registered students and their activity summary for developer review."""
    connection = get_connection()
    try:
        rows = connection.execute("""
            SELECT s.id, s.name, s.email, s.role, s.course, s.institution, s.graduation_year, s.created_at,
                   COUNT(DISTINCT c.id) as conversation_count,
                   COUNT(DISTINCT m.id) as message_count
            FROM students s
            LEFT JOIN conversations c ON c.student_id = s.id
            LEFT JOIN messages m ON m.conversation_id = c.id
            GROUP BY s.id
            ORDER BY s.id ASC
        """).fetchall()

        users = []
        for r in rows:
            users.append({
                "id": r["id"],
                "name": r["name"],
                "email": r["email"],
                "role": r["role"] or ("admin" if r["email"] == "blackfeatheractual@proton.me" else "student"),
                "course": r["course"],
                "institution": r["institution"],
                "graduation_year": r["graduation_year"],
                "created_at": r["created_at"],
                "conversation_count": r["conversation_count"],
                "message_count": r["message_count"]
            })
        return {"users": users, "total": len(users)}
    finally:
        connection.close()


@router.post("/admin/reset-password")
def reset_user_password_admin(request: AdminPasswordReset, admin: dict = Depends(require_admin)):
    """Direct developer password reset for any user account."""
    target_email = request.email.strip().lower()
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    new_hash = hash_password(request.new_password)
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE students SET password_hash = ? WHERE email = ?", (new_hash, target_email))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"User with email '{target_email}' not found.")
        connection.commit()
        return {"message": f"Password for {target_email} updated successfully."}
    finally:
        connection.close()


@router.delete("/admin/users/{user_id}")
def delete_user_admin(user_id: int, admin: dict = Depends(require_admin)):
    """Delete a user account and cascade delete their conversations and messages."""
    connection = get_connection()
    try:
        target = connection.execute("SELECT id, email FROM students WHERE id = ?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found.")
        if target["email"] == "blackfeatheractual@proton.me":
            raise HTTPException(status_code=400, detail="Cannot delete root developer account.")

        connection.execute("DELETE FROM students WHERE id = ?", (user_id,))
        connection.commit()
        return {"message": f"User {target['email']} deleted successfully."}
    finally:
        connection.close()


@router.post("/admin/create-user")
def create_user_admin(request: AdminCreateUser, admin: dict = Depends(require_admin)):
    """Directly provision a student or admin user."""
    target_email = request.email.strip().lower()
    target_name = request.name.strip()
    if not target_email or not target_name:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    new_hash = hash_password(request.password)
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO students (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, (target_name, target_email, new_hash, request.role or "student"))
        connection.commit()
        return {"message": f"User {target_email} provisioned successfully.", "id": cursor.lastrowid}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail=f"Email '{target_email}' is already registered.")
    finally:
        connection.close()


@router.post("/admin/reset-database")
def reset_database_admin(admin: dict = Depends(require_admin)):
    """Completely wipe and re-seed the database with clean admin and student accounts."""
    reset_database()
    return {"message": "Database wiped and re-seeded with clean admin and student accounts."}
