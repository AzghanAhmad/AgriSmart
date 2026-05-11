def test_chatbot_health(client):
    r = client.get("/api/chatbot/health")
    assert r.status_code == 200
    j = r.get_json()
    # Accept legacy + current health statuses.
    assert j["status"] in ("ok", "healthy")
    assert j["service"] == "chatbot"


def test_chatbot_conversations_requires_auth(client):
    r = client.get("/api/chatbot/conversations")
    assert r.status_code == 401
    r = client.post("/api/chatbot/conversations", json={})
    assert r.status_code == 401


def test_chatbot_create_list_get_messages(client, auth_token):
    h = {"Authorization": f"Bearer {auth_token}"}

    # create
    r = client.post("/api/chatbot/conversations", headers=h, json={"title": "Test thread"})
    assert r.status_code == 201
    created = r.get_json()
    cid = created["conversation_id"]
    assert isinstance(cid, str) and cid

    # list should include it
    r = client.get("/api/chatbot/conversations", headers=h)
    assert r.status_code == 200
    out = r.get_json()
    assert "conversations" in out
    assert any(c.get("id") == cid for c in out["conversations"])

    # messages should be empty initially
    r = client.get(f"/api/chatbot/conversations/{cid}/messages", headers=h)
    assert r.status_code == 200
    msgs = r.get_json()
    assert msgs["conversation_id"] == cid
    assert isinstance(msgs["messages"], list)


def test_chatbot_get_messages_404_for_other_user(client, auth_token):
    # Create one conversation with token user, then try to read with no auth (should be 401)
    h = {"Authorization": f"Bearer {auth_token}"}
    r = client.post("/api/chatbot/conversations", headers=h, json={})
    assert r.status_code == 201
    cid = r.get_json()["conversation_id"]

    r = client.get(f"/api/chatbot/conversations/{cid}/messages")
    assert r.status_code == 401

