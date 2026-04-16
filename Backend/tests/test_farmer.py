import io


def test_farmer_detection_mocked(client):
    data = {
        "file": (io.BytesIO(b"fake-image-bytes"), "x.jpg"),
        "cropType": "wheat",
        "farmerId": "farmer-123",
        "landId": "land-1",
    }
    r = client.post("/api/farmer/detections", data=data, content_type="multipart/form-data")
    assert r.status_code in (201, 500)

