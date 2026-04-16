def test_guidance_list(client):
    r = client.get("/api/guidance?crop=wheat")
    assert r.status_code == 200
    j = r.get_json()
    assert "items" in j

