import sqlite3
import os
import hashlib
import secrets
from pathlib import Path

# Database location
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "future_forge.db"

PBKDF2_ITERATIONS = 10000


def hash_password(password: str) -> str:
    """Generate a lightweight, zero-extra-RAM PBKDF2-HMAC-SHA256 password hash."""
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2:sha256:{PBKDF2_ITERATIONS}${salt}${hash_bytes.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against PBKDF2 hash or legacy argon2 hash with zero OOM risk."""
    if not hashed or not password:
        return False
    if hashed.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed.split("$")
            iterations = int(parts[0].split(":")[2])
            salt = parts[1]
            expected_hex = parts[2]
            computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
            return secrets.compare_digest(computed, expected_hex)
        except Exception:
            return False
    # If legacy Argon2 hash, attempt fallback verification safely
    try:
        from pwdlib import PasswordHash
        return PasswordHash.recommended().verify(password, hashed)
    except Exception:
        return False


def get_connection():
    """Create and return a database connection."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    # Enable foreign key relationships
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_db():
    """Create the Future Forge database tables and ensure admin is seeded."""
    connection = get_connection()

    try:
        cursor = connection.cursor()

        # 1. Student accounts
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'student',
                course TEXT,
                institution TEXT,
                graduation_year INTEGER,
                interests TEXT DEFAULT '[]',
                skills TEXT DEFAULT '[]',
                preferred_domains TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Chat conversations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                title TEXT DEFAULT 'New Conversation',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (student_id)
                    REFERENCES students(id)
                    ON DELETE CASCADE
            )
        """)

        # 3. Individual chat messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL
                    CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE
            )
        """)

        # Add any missing columns to existing databases
        existing_columns = {
            row["name"]
            for row in cursor.execute("PRAGMA table_info(students)").fetchall()
        }

        new_columns = {
            "role": "TEXT DEFAULT 'student'",
            "interests": "TEXT DEFAULT '[]'",
            "skills": "TEXT DEFAULT '[]'",
            "preferred_domains": "TEXT DEFAULT '[]'",
        }

        for column, definition in new_columns.items():
            if column not in existing_columns:
                cursor.execute(
                    f"ALTER TABLE students ADD COLUMN {column} {definition}"
                )

        # Ensure Developer Admin Account exists with Admin@123
        dev_email = "blackfeatheractual@proton.me"
        dev_pass = "Admin@123"
        cursor.execute("SELECT id, password_hash FROM students WHERE email = ?", (dev_email,))
        dev_row = cursor.fetchone()

        if not dev_row:
            hashed = hash_password(dev_pass)
            cursor.execute("""
                INSERT INTO students (name, email, password_hash, role)
                VALUES ('BlackFeather Dev', ?, ?, 'admin')
            """, (dev_email, hashed))
        else:
            current_hash = dev_row["password_hash"]
            if not current_hash.startswith("pbkdf2:") or not verify_password(dev_pass, current_hash):
                new_hash = hash_password(dev_pass)
                cursor.execute("UPDATE students SET password_hash = ?, role = 'admin' WHERE email = ?", (new_hash, dev_email))

        # Ensure default student account exists
        stu_email = "anupriya.student@gmail.com"
        stu_pass = "Pass1234!@#"
        cursor.execute("SELECT id, password_hash FROM students WHERE email = ?", (stu_email,))
        stu_row = cursor.fetchone()
        if not stu_row:
            stu_hash = hash_password(stu_pass)
            cursor.execute("""
                INSERT INTO students (name, email, password_hash, role)
                VALUES ('Anupriya', ?, ?, 'student')
            """, (stu_email, stu_hash))
        else:
            current_hash = stu_row["password_hash"]
            if not current_hash.startswith("pbkdf2:") or not verify_password(stu_pass, current_hash):
                new_hash = hash_password(stu_pass)
                cursor.execute("UPDATE students SET password_hash = ?, role = 'student' WHERE email = ?", (new_hash, stu_email))

        connection.commit()
        print("Future Forge database initialized successfully!")

    except sqlite3.Error:
        connection.rollback()
        raise

    finally:
        connection.close()


def reset_database():
    """Completely wipe the database and re-seed clean dev and student accounts."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS messages")
        cursor.execute("DROP TABLE IF EXISTS conversations")
        cursor.execute("DROP TABLE IF EXISTS students")
        connection.commit()
    finally:
        connection.close()

    init_db()
    print("Database reset and re-seeded successfully.")


if __name__ == "__main__":
    init_db()
    print(f"Database location: {DB_PATH}")
