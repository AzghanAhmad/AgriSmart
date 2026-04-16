import io


def test_predict_mocked(client):
    # Use a real tiny JPEG so PIL can decode it
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (1, 1), (255, 255, 255)).save(buf, format="JPEG")
    buf.seek(0)
    data = {"file": (buf, "x.jpg")}
    r = client.post("/predict/wheat", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    j = r.get_json()
    assert j["cropType"] == "wheat"
    assert "disease" in j

