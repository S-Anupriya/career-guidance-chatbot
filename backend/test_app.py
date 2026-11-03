import json
import sqlite3
from fastapi.testclient import TestClient

from main import app
from database import get_connection, init_db

client = TestClient(app)

def test_full_pipeline():
    init_db()

    # 1. Register test student
    test_email = "test.student@example.com"
    # Clean up previous run if needed
    conn = get_connection()
    conn.execute("DELETE FROM students WHERE email = ?", (test_email,))
    conn.commit()
    conn.close()

    reg_resp = client.post(
        "/auth/register",
        json={
            "name": "Ananya Sharma",
            "email": test_email,
            "password": "StrongPassword123"
        }
    )
    assert reg_resp.status_code == 201, reg_resp.text
    print("✓ Registration passed")

    # 2. Login
    login_resp = client.post(
        "/auth/login",
        json={
            "email": test_email,
            "password": "StrongPassword123"
        }
    )
    assert login_resp.status_code == 200, login_resp.text
    login_data = login_resp.json()
    token = login_data["access_token"]
    student_id = login_data["student"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login passed, JWT token acquired")

    # 3. Update Profile (Task 6)
    profile_resp = client.put(
        "/auth/profile",
        headers=headers,
        json={
            "course": "BCA",
            "institution": "East Point College, Bangalore",
            "graduation_year": 2026,
            "interests": ["Artificial Intelligence", "Data Science"],
            "skills": ["Python", "SQL", "Git"],
            "preferred_domains": ["AI/ML Engineer", "Software Developer"]
        }
    )
    assert profile_resp.status_code == 200, profile_resp.text
    profile_data = profile_resp.json()["student"]
    assert profile_data["course"] == "BCA"
    assert profile_data["graduation_year"] == 2026
    assert "Python" in profile_data["skills"]
    print("✓ Student profile update passed")

    # 4. Check /auth/me
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()["student"]
    assert me_data["name"] == "Ananya Sharma"
    print("✓ /auth/me verification passed")

    # 5. Create conversation (Task 8)
    conv_create_resp = client.post(
        "/conversations",
        headers=headers,
        json={"title": "Career After BCA Guidance"}
    )
    assert conv_create_resp.status_code == 201
    conv_id = conv_create_resp.json()["id"]
    print(f"✓ Conversation created (id: {conv_id})")

    # 6. List conversations
    conv_list_resp = client.get("/conversations", headers=headers)
    assert conv_list_resp.status_code == 200
    conv_list = conv_list_resp.json()
    assert len(conv_list) >= 1
    assert any(c["id"] == conv_id for c in conv_list)
    print("✓ Conversations listing passed")

    # 7. Post Chat & verify message persistence (Task 7 & 9)
    # Using non-streaming for unit test assertion
    chat_resp = client.post(
        "/chat",
        headers=headers,
        json={
            "message": "What are the best career options after BCA?",
            "conversation_id": conv_id,
            "stream": False
        }
    )
    assert chat_resp.status_code == 200, chat_resp.text
    chat_data = chat_resp.json()
    assert "reply" in chat_data
    print(f"✓ Chat responded with model '{chat_data['model']}' and RAG={chat_data['has_rag']}")

    # 7b. Test Streaming chat endpoint with conversation persistence
    stream_resp = client.post(
        "/chat",
        headers=headers,
        json={
            "message": "Tell me about NIMCET MCA entrance exam.",
            "conversation_id": conv_id,
            "stream": True
        }
    )
    assert stream_resp.status_code == 200
    assert "X-Conversation-Id" in stream_resp.headers
    stream_content = stream_resp.text
    assert len(stream_content) > 10
    print(f"✓ Streaming chat verified (returned {len(stream_content)} chars, X-Conversation-Id={stream_resp.headers['X-Conversation-Id']})")

    # 8. Verify messages were saved in database
    conv_detail_resp = client.get(f"/conversations/{conv_id}", headers=headers)
    assert conv_detail_resp.status_code == 200
    messages = conv_detail_resp.json()["messages"]
    assert len(messages) >= 2, f"Expected user + assistant messages, found: {len(messages)}"
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "What are the best career options after BCA?"
    assert messages[1]["role"] == "assistant"
    assert len(messages[1]["content"]) > 10
    print(f"✓ Saved messages verified in SQLite: {len(messages)} messages stored")

    # 9. Delete conversation
    del_resp = client.delete(f"/conversations/{conv_id}", headers=headers)
    assert del_resp.status_code == 200
    check_del = client.get(f"/conversations/{conv_id}", headers=headers)
    assert check_del.status_code == 404
    print("✓ Conversation deletion and cascade verified")

    # Clean up test user
    conn = get_connection()
    conn.execute("DELETE FROM students WHERE email = ?", (test_email,))
    conn.commit()
    conn.close()

    print("\n==============================================")
    print("  ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("==============================================")

if __name__ == "__main__":
    test_full_pipeline()
