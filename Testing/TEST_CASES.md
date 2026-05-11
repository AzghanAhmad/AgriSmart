# AgriSmart Test Cases (Verification & Validation)

## 1) Disease Detection Module

### TC-DD-01: Successful crop disease detection (Wheat, Rice, Cotton)
- **Precondition:** Backend and model service are running.
- **Steps:** Submit valid disease image for each crop type.
- **Expected:** HTTP 200; disease result returned for each crop; saved in DB.

### TC-DD-02: Disease detection with blurry or low-quality image
- **Precondition:** Backend running.
- **Steps:** Submit blurred image.
- **Expected:** Graceful response; no crash; low confidence or uncertain output.

### TC-DD-03: Disease detection with invalid file format
- **Precondition:** Backend running.
- **Steps:** Upload non-image file (e.g., `.txt`).
- **Expected:** Validation error (4xx), clear message.

### TC-DD-04: Disease detection offline / network error handling
- **Precondition:** Mobile app installed.
- **Steps:** Disable network and trigger detection.
- **Expected:** User-friendly network error shown; app remains stable.

### TC-DD-05: Disease detection response time validation (< 5 seconds)
- **Precondition:** Stable environment, warmed backend.
- **Steps:** Run detection 10 times with normal images.
- **Expected:** p95 response time < 5s.

### TC-DD-06: Disease detection returns confidence score
- **Precondition:** Backend running.
- **Steps:** Perform successful detection.
- **Expected:** Confidence is present, numeric, and in valid range.

## 2) Treatment Guidance Module

### TC-TG-07: Get treatment guidance after successful disease detection
- **Precondition:** Disease detected.
- **Steps:** Open treatment guidance.
- **Expected:** Relevant treatment appears for detected disease.

### TC-TG-08: Treatment guidance in English and Urdu
- **Precondition:** App language toggle enabled.
- **Steps:** Switch language and fetch guidance.
- **Expected:** Text appears in selected language.

### TC-TG-09: Treatment guidance when disease not found in database
- **Precondition:** Unknown disease input.
- **Steps:** Request guidance with unknown disease.
- **Expected:** Fallback/“not found” message; no crash.

### TC-TG-10: Treatment guidance with alternate remedies
- **Precondition:** Disease with multiple remedies exists.
- **Steps:** Open guidance details.
- **Expected:** Alternate/secondary remedies are listed.

## 3) Task Scheduling Module

### TC-TS-11: Create personalized farming task/schedule
- **Precondition:** Farmer logged in.
- **Steps:** Create a schedule task with valid values.
- **Expected:** Task saved and visible in schedule list.

### TC-TS-12: Task scheduling with invalid date/time
- **Precondition:** Farmer logged in.
- **Steps:** Enter invalid date/time.
- **Expected:** Validation error; task not created.

### TC-TS-13: Task notification reminder
- **Precondition:** Reminder-enabled task exists.
- **Steps:** Wait until reminder time.
- **Expected:** Reminder/notification is triggered.

### TC-TS-14: Offline task creation
- **Precondition:** Farmer logged in.
- **Steps:** Disable network and create task.
- **Expected:** Local save queue or clear offline error behavior.

## 4) Crop Tracking & Monitoring

### TC-CT-15: Upload crop image for production tracking
- **Precondition:** Farmer logged in.
- **Steps:** Upload crop image in tracking flow.
- **Expected:** Upload succeeds; record visible in history/tracking.

### TC-CT-16: View crop health trends and statistics
- **Precondition:** Existing detection/tracking data.
- **Steps:** Open dashboard/profile trends.
- **Expected:** Charts/stats render with real values.

### TC-CT-17: Generate task scheduling report (PDF/Excel)
- **Precondition:** Tasks exist.
- **Steps:** Trigger report export.
- **Expected:** Export file generated/shared successfully.

## 5) Geotagging & Heatmap

### TC-GT-18: Geotag disease report using GPS
- **Precondition:** Location permission granted.
- **Steps:** Submit report with geotag enabled.
- **Expected:** Latitude/longitude stored and retrievable.

### TC-HM-19: Display regional disease heatmap
- **Precondition:** Disease points exist in DB.
- **Steps:** Open heatmap page.
- **Expected:** Heatmap points are rendered with intensity.

### TC-HM-20: Heatmap filtering by crop type and time range
- **Precondition:** Mixed data across crop/time.
- **Steps:** Apply filters.
- **Expected:** Points update correctly by selected filters.

## 6) Chatbot & Voice Assistance

### TC-CB-21: Text-based multilingual chatbot response
- **Precondition:** Chatbot service available.
- **Steps:** Ask in English and Urdu.
- **Expected:** Meaningful response in context/language.

### TC-CB-22: Voice input (Speech-to-Text) handling
- **Precondition:** Microphone permission granted.
- **Steps:** Speak query through voice input.
- **Expected:** Correct transcript produced for backend/chat.

### TC-CB-23: Voice output (Text-to-Speech) response
- **Precondition:** TTS available.
- **Steps:** Trigger voice playback.
- **Expected:** Response is spoken and audible.

### TC-VA-24: Full voice assistance command flow
- **Precondition:** Voice stack enabled.
- **Steps:** Speak query -> STT -> chatbot -> TTS.
- **Expected:** End-to-end voice flow completes.

### TC-CB-25: Chatbot fallback when query is not understood
- **Precondition:** Chatbot running.
- **Steps:** Ask irrelevant/ambiguous query.
- **Expected:** Safe fallback message, no crash/timeout.

## 7) Admin Features

### TC-UM-26: Admin - Create, Update, Deactivate user
- **Precondition:** Admin logged in.
- **Steps:** Perform create/update/deactivate.
- **Expected:** Changes persist and reflect in user management.

### TC-DS-27: Admin - Update datasets (CSV upload + validation)
- **Precondition:** Admin logged in.
- **Steps:** Upload valid and invalid CSV.
- **Expected:** Valid accepted; invalid rejected with clear error.

### TC-VS-28: Admin - Verify pending data submissions
- **Precondition:** Pending submissions exist.
- **Steps:** Approve/reject submissions.
- **Expected:** Status updates and audit/action reflects.

### TC-AL-29: Admin - Manage system alerts
- **Precondition:** Alerts available.
- **Steps:** Create/approve/update alert.
- **Expected:** Alert state transitions correctly.

### TC-ACT-30: Admin - Monitor activity logs and export
- **Precondition:** Activity exists.
- **Steps:** Open logs and export.
- **Expected:** Logs visible and export succeeds.

## 8) Profile & Settings

### TC-PRO-31: User/Admin profile update
- **Precondition:** Logged in user.
- **Steps:** Update profile fields and save.
- **Expected:** Saved in backend and persists after refresh/login.

### TC-LANG-32: Language switch (English ↔ Urdu)
- **Precondition:** App running.
- **Steps:** Toggle language.
- **Expected:** UI updates immediately and persists.

### TC-AUTH-33: Login and role-based authorization
- **Precondition:** Farmer + admin accounts.
- **Steps:** Login with each role and open restricted pages.
- **Expected:** Correct route access enforced by role.

## 9) Cross-Cutting / Non-Functional

### TC-PERF-34: Disease detection performance test
- **Precondition:** Benchmark environment.
- **Steps:** Run repeated detection load.
- **Expected:** Response remains under threshold; no major degradation.

### TC-USAB-35: Bilingual UI text rendering validation
- **Precondition:** English and Urdu translations available.
- **Steps:** Navigate key screens in both languages.
- **Expected:** No truncation, overlap, or layout breaks.

### TC-OFF-36: Offline mode support verification
- **Precondition:** Device can toggle network.
- **Steps:** Test key flows offline.
- **Expected:** Graceful handling, clear user feedback.

### TC-SEC-37: Input validation and security (SQL injection, XSS)
- **Precondition:** Test environment only.
- **Steps:** Submit malicious payloads in forms/queries.
- **Expected:** Payloads sanitized/rejected; no DB/UI compromise.

### TC-INT-38: End-to-End: Disease Detection -> Treatment -> Schedule -> Report
- **Precondition:** Full stack up.
- **Steps:** Run complete business flow from detection to report export.
- **Expected:** Entire chain succeeds with consistent data.
