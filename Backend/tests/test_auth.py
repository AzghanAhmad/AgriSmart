def test_auth_flow(client):
    # signup (allow 201 created or 409 conflict if already exists)
    r = client.post(
        "/api/auth/signup",
        json={"name": "Py Tester", "email": "py@test.com", "password": "pass123"},
    )
    assert r.status_code in (201, 409)

    # login
    r = client.post(
        "/api/auth/login",
        json={"email": "py@test.com", "password": "pass123"},
    )
    assert r.status_code == 200
    token = r.get_json()["token"]

    # me
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.get_json()
    assert me["email"] == "py@test.com"

