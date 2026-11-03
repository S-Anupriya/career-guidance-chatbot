
import sqlite3
from pathlib import Path

# Database location
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "future_forge.db"


def get_connection():
    """Create and return a database connection."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    # Enable foreign key relationships
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_db():
    """Create the Future Forge database tables."""

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
                course TEXT,
                institution TEXT,
                graduation_year INTEGER,
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

        # 4. Add student career profile fields to existing databases.
        existing_columns = {
            row["name"]
            for row in cursor.execute("PRAGMA table_info(students)").fetchall()
        }

        new_columns = {
            "interests": "TEXT DEFAULT '[]'",
            "skills": "TEXT DEFAULT '[]'",
            "preferred_domains": "TEXT DEFAULT '[]'",
        }

        for column, definition in new_columns.items():
            if column not in existing_columns:
                cursor.execute(
                    f"ALTER TABLE students ADD COLUMN {column} {definition}"
                )

        connection.commit()
        print("Future Forge database initialized successfully!")

    except sqlite3.Error:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    init_db()
    print(f"Database location: {DB_PATH}")
