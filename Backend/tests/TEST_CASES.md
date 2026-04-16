## Backend Test Cases (AgriSmart)

This document explains what each backend test file covers and what each test case verifies.

### How to run

- **Run all tests**:

```bash
cd Backend
python -m pytest -q
```

- **Verbose output**:

```bash
cd Backend
python -m pytest -v
```

- **Run one file**:

```bash
cd Backend
python -m pytest -q tests/test_support.py
```

---

## Common test setup

### `tests/conftest.py`

- **`mock_yolo_and_seed_db` (session, autouse)**:
  - Mocks YOLO model loading/inference so `/predict/*` tests do not require real weights.
  - Ensures DB tables are created once for the whole test run.
- **`client` fixture**:
  - Provides Flask test client.
- **`auth_token` fixture**:
  - Creates (or reuses) a test user and logs in.
  - Returns a valid Bearer token for authenticated endpoints.

---

## Basic server checks

### `tests/test_home.py`

- **`test_home`**
  - **Goal**: server is up and returns JSON from `/`.
  - **Checks**: HTTP 200 and response has `message`.

---

## Authentication

### `tests/test_auth.py`

- **`test_auth_flow`**
  - **Goal**: signup + login + `/api/auth/me` works end-to-end.
  - **Checks**:
    - Signup returns 201 or 409
    - Login returns 200 and a token
    - `/api/auth/me` returns the same email

---

## Guidance (disease guidance database)

### `tests/test_guidance.py`

- **`test_guidance_list`**
  - **Goal**: guidance API returns data for a crop.
  - **Checks**: `/api/guidance?crop=wheat` returns HTTP 200 and has `items`.

### `tests/test_guidance_filters.py`

- **`test_guidance_filter_by_crop_returns_count`**
  - **Goal**: crop filter works and the API’s `count` matches returned items.
  - **Checks**:
    - `count == len(items)`
    - all returned items have `crop == wheat`

- **`test_guidance_filter_by_crop_and_disease_is_subset`**
  - **Goal**: filtering by disease name returns only that disease.
  - **Flow**:
    - Fetch any wheat item
    - Query again with `&disease=<name>`
  - **Checks**: every returned item has the exact disease `name`.

- **`test_guidance_unknown_crop_returns_empty`**
  - **Goal**: unknown crops return empty results instead of error.
  - **Checks**: `items == []` and `count == 0`.

---

## Prediction (YOLO mocked)

### `tests/test_predict.py`

- **`test_predict_mocked`**
  - **Goal**: `/predict/wheat` can process an image and return a result.
  - **Setup**: YOLO is mocked in `conftest.py`.
  - **Checks**:
    - HTTP 200
    - JSON includes `cropType == wheat`
    - JSON includes `disease`

---

## Farmer module (detections)

### `tests/test_farmer.py`

- **`test_farmer_detection_mocked`**
  - **Goal**: detection upload endpoint responds correctly.
  - **Checks**: response is either 201 (created) or 500 (if environment/DB constraints fail).
  - **Note**: This test ensures the route is wired; it’s not a strict “DB must accept this” test.

---

## Support module

### `tests/test_support.py`

- **`test_support_contact_requires_fields`**
  - **Goal**: `/api/support/contact` validates required fields.
  - **Checks**: missing fields ⇒ HTTP 400 with `error`.

- **`test_support_contact_success_fallback_log`**
  - **Goal**: contact endpoint succeeds even when SMTP isn’t configured.
  - **Setup**: clears `SMTP_HOST` to force “fallback log” path.
  - **Checks**: HTTP 200 with `{ ok: true }`.

- **`test_support_bug_report_requires_description`**
  - **Goal**: bug report endpoint validates `description`.
  - **Checks**: missing description ⇒ HTTP 400 with `error`.

- **`test_support_bug_report_success_optional_screenshot`**
  - **Goal**: bug report succeeds with optional screenshot attachment.
  - **Setup**: clears `SMTP_HOST` so it uses fallback log.
  - **Checks**: HTTP 200 with `{ ok: true }`.

---

## Chatbot API (safe tests: no model call)

### `tests/test_chatbot_api.py`

- **`test_chatbot_health`**
  - **Goal**: chatbot routes are registered and respond.
  - **Checks**: `/api/chatbot/health` returns `{ status: ok, service: chatbot }`.

- **`test_chatbot_conversations_requires_auth`**
  - **Goal**: conversation endpoints require authentication.
  - **Checks**: GET/POST `/api/chatbot/conversations` returns 401 without Bearer token.

- **`test_chatbot_create_list_get_messages`**
  - **Goal**: authenticated conversation CRUD works without invoking the LLM.
  - **Flow**:
    - Create conversation
    - List conversations and verify it appears
    - Fetch messages (should be empty initially)

- **`test_chatbot_get_messages_404_for_other_user`**
  - **Goal**: message retrieval is protected by auth.
  - **Checks**: messages endpoint returns 401 if called without Bearer token.

---

## Yield estimation (pure unit tests)

### `tests/test_yield_estimation.py`

This file contains detailed unit tests for the yield estimation module:

- **Helper functions**: `clamp`, crop type normalization
- **Benchmarks**: supported crops, per-crop max yield
- **Formula parts**:
  - environmental factor
  - correction factor (health/disease)
  - yield factor clamping
  - yield range calculation
- **Full estimation**: structure, sanity, and monotonicity checks
- **Validation**: missing/invalid fields produce errors

