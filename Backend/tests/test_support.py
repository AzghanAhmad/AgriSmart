import io


def test_support_contact_requires_fields(client):
    r = client.post("/api/support/contact", json={})
    assert r.status_code == 400
    j = r.get_json()
    assert "error" in j


def test_support_contact_success_fallback_log(client, monkeypatch):
    # Force SMTP fallback path by clearing SMTP_HOST
    monkeypatch.delenv("SMTP_HOST", raising=False)
    r = client.post(
        "/api/support/contact",
        json={
            "name": "Tester",
            "email": "t@example.com",
            "subject": "Help",
            "message": "Need assistance",
        },
    )
    assert r.status_code == 200
    j = r.get_json()
    assert j.get("ok") is True


def test_support_bug_report_requires_description(client):
    r = client.post("/api/support/report-bug", data={}, content_type="multipart/form-data")
    assert r.status_code == 400
    j = r.get_json()
    assert "error" in j


def test_support_bug_report_success_optional_screenshot(client, monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    data = {
        "description": "Bug found on chat screen",
        "email": "reporter@example.com",
        "screenshot": (io.BytesIO(b"fake-bytes"), "s.jpg"),
    }
    r = client.post("/api/support/report-bug", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    j = r.get_json()
    assert j.get("ok") is True

