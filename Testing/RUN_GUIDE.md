# How to Run Tests

## A) Run Existing Automated Backend Tests (Recommended)

From repository root:

```powershell
cd Backend
python -m pytest -q
```

Verbose:

```powershell
cd Backend
python -m pytest -v
```

Run a specific file:

```powershell
cd Backend
python -m pytest -q tests/test_auth.py
```

Run tests by keyword:

```powershell
cd Backend
python -m pytest -q -k "auth or guidance or schedule"
```

## B) Execute This V&V Pack (38 Test Cases)

The test cases in `TEST_CASES.md` are a V&V execution checklist (mix of automated + manual/device tests).

1. Open `execution-template.csv`.
2. For each test ID, execute the steps from `TEST_CASES.md`.
3. Fill `Actual Result`, `Status`, and `Evidence`.

## C) Environment Checklist Before Running

- Backend service running (`python Backend/app.py` or your normal start command)
- Mobile app running on device/emulator
- DB connected and migrated
- Internet available for chatbot/model warmup where needed
- Test users available:
  - Admin account
  - Farmer account

## D) Suggested Execution Order

1. Module 1 -> 3 (core flows)
2. Module 5 (heatmap/geotagging)
3. Module 6 (chatbot/voice)
4. Module 7/8 (admin + profile)
5. Module 9 (non-functional and E2E)

## E) Evidence to Capture

- API responses (status code + payload snippet)
- Screenshots/video for UI flows
- Exported files (CSV/PDF/Excel)
- Performance timing logs for TC-DD-05 and TC-PERF-34
