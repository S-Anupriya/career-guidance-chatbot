import sqlite3
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import get_connection
from auth import get_current_student

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(default="New Conversation", max_length=120)


class UpdateConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


class ConversationListItem(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int
    last_message: Optional[str] = None


class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    messages: List[MessageResponse]


# Helper: save a chat message to SQLite
def save_chat_message(conversation_id: int, role: str, content: str) -> int:
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, role, content),
        )
        cursor.execute(
            """
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (conversation_id,),
        )
        connection.commit()
        return cursor.lastrowid
    except sqlite3.Error:
        connection.rollback()
        raise
    finally:
        connection.close()


# Helper: get existing conversation or create a new one
def get_or_create_conversation(
    student_id: int,
    conversation_id: Optional[int] = None,
    first_query: str = ""
) -> int:
    connection = get_connection()
    try:
        cursor = connection.cursor()

        if conversation_id:
            row = cursor.execute(
                "SELECT id, title FROM conversations WHERE id = ? AND student_id = ?",
                (conversation_id, student_id),
            ).fetchone()
            if row:
                # If existing title is still default, update it with user query
                if row["title"] == "New Conversation" and first_query:
                    cleaned_title = first_query.strip().replace("\n", " ")
                    if len(cleaned_title) > 42:
                        cleaned_title = cleaned_title[:42] + "..."
                    cursor.execute(
                        "UPDATE conversations SET title = ? WHERE id = ?",
                        (cleaned_title, conversation_id),
                    )
                    connection.commit()
                return row["id"]

        # Create new conversation
        title = "New Conversation"
        if first_query:
            cleaned = first_query.strip().replace("\n", " ")
            title = (cleaned[:42] + "...") if len(cleaned) > 42 else cleaned

        cursor.execute(
            """
            INSERT INTO conversations (student_id, title)
            VALUES (?, ?)
            """,
            (student_id, title or "New Conversation"),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        connection.close()


# 1. List conversations for current student
@router.get("", response_model=List[ConversationListItem])
def list_student_conversations(
    current_student: dict = Depends(get_current_student),
):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        rows = cursor.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   COUNT(m.id) as message_count,
                   (
                       SELECT content FROM messages
                       WHERE conversation_id = c.id
                       ORDER BY created_at DESC LIMIT 1
                   ) as last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.student_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            """,
            (current_student["id"],),
        ).fetchall()

        return [
            ConversationListItem(
                id=row["id"],
                title=row["title"],
                created_at=str(row["created_at"]),
                updated_at=str(row["updated_at"]),
                message_count=row["message_count"],
                last_message=row["last_message"],
            )
            for row in rows
        ]
    finally:
        connection.close()


# 2. Create a new conversation
@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_conversation(
    request: CreateConversationRequest,
    current_student: dict = Depends(get_current_student),
):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        title = (request.title or "New Conversation").strip()
        cursor.execute(
            """
            INSERT INTO conversations (student_id, title)
            VALUES (?, ?)
            """,
            (current_student["id"], title),
        )
        connection.commit()
        new_id = cursor.lastrowid

        row = cursor.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (new_id,),
        ).fetchone()

        return {
            "id": row["id"],
            "title": row["title"],
            "created_at": str(row["created_at"]),
            "updated_at": str(row["updated_at"]),
        }
    finally:
        connection.close()


# 3. Get conversation details and all its messages
@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_history(
    conversation_id: int,
    current_student: dict = Depends(get_current_student),
):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        conv = cursor.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE id = ? AND student_id = ?
            """,
            (conversation_id, current_student["id"]),
        ).fetchone()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )

        messages = cursor.execute(
            """
            SELECT id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC, id ASC
            """,
            (conversation_id,),
        ).fetchall()

        return ConversationDetailResponse(
            id=conv["id"],
            title=conv["title"],
            created_at=str(conv["created_at"]),
            updated_at=str(conv["updated_at"]),
            messages=[
                MessageResponse(
                    id=m["id"],
                    role=m["role"],
                    content=m["content"],
                    created_at=str(m["created_at"]),
                )
                for m in messages
            ],
        )
    finally:
        connection.close()


# 4. Delete a conversation
@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_student: dict = Depends(get_current_student),
):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        conv = cursor.execute(
            "SELECT id FROM conversations WHERE id = ? AND student_id = ?",
            (conversation_id, current_student["id"]),
        ).fetchone()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )

        cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        connection.commit()
        return {"message": "Conversation deleted successfully."}
    finally:
        connection.close()


# 5. Rename a conversation
@router.patch("/{conversation_id}")
def rename_conversation(
    conversation_id: int,
    request: UpdateConversationRequest,
    current_student: dict = Depends(get_current_student),
):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        conv = cursor.execute(
            "SELECT id FROM conversations WHERE id = ? AND student_id = ?",
            (conversation_id, current_student["id"]),
        ).fetchone()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found.",
            )

        new_title = request.title.strip()
        if not new_title:
            raise HTTPException(status_code=400, detail="Title cannot be empty.")

        cursor.execute(
            "UPDATE conversations SET title = ? WHERE id = ?",
            (new_title, conversation_id),
        )
        connection.commit()
        return {"id": conversation_id, "title": new_title}
    finally:
        connection.close()
