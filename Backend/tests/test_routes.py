import io


def test_home(client):
    r = client.get("/")
    assert r.status_code == 200
    j = r.get_json()
    assert "message" in j


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


def test_guidance_list(client):
    r = client.get("/api/guidance?crop=wheat")
    assert r.status_code == 200
    j = r.get_json()
    assert "items" in j


def test_predict_mocked(client):
    data = {"file": (io.BytesIO(b"fake-image-bytes"), "x.jpg")}
    r = client.post("/predict/wheat", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    j = r.get_json()
    assert j["cropType"] == "wheat"
    assert "disease" in j


def test_farmer_detection_mocked(client):
    data = {
        "file": (io.BytesIO(b"fake-image-bytes"), "x.jpg"),
        "cropType": "wheat",
        "farmerId": "farmer-123",
        "landId": "land-1",
    }
    r = client.post("/api/farmer/detections", data=data, content_type="multipart/form-data")
    assert r.status_code in (201, 500)

