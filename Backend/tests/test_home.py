def test_home(client):
    r = client.get("/")
    assert r.status_code == 200
    j = r.get_json()
    assert "message" in j

