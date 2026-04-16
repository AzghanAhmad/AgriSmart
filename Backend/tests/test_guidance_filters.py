def test_guidance_filter_by_crop_returns_count(client):
    r = client.get("/api/guidance?crop=wheat")
    assert r.status_code == 200
    j = r.get_json()
    assert "items" in j
    assert "count" in j
    assert j["count"] == len(j["items"])
    assert all((it.get("crop") or "").lower() == "wheat" for it in j["items"])


def test_guidance_filter_by_crop_and_disease_is_subset(client):
    # Get one wheat disease name (if any), then filter by it
    r = client.get("/api/guidance?crop=wheat")
    assert r.status_code == 200
    j = r.get_json()
    items = j.get("items") or []
    if not items:
        # If seed data isn't present, at least ensure endpoint still works.
        assert j["count"] == 0
        return

    disease_name = items[0]["name"]
    r2 = client.get(f"/api/guidance?crop=wheat&disease={disease_name}")
    assert r2.status_code == 200
    j2 = r2.get_json()
    assert all(it.get("name") == disease_name for it in j2["items"])


def test_guidance_unknown_crop_returns_empty(client):
    r = client.get("/api/guidance?crop=unknowncrop")
    assert r.status_code == 200
    j = r.get_json()
    assert j["count"] == 0
    assert j["items"] == []

