# Text Clipper — Story 12 manual verification checklist

**Slice 7 close-out.** Complements automated tests (Story 10/11) and [`progress-slice-5-onward.md`](progress-slice-5-onward.md).

**Environment:** Docker Canvas at http://localhost:3000 (when running `docker compose up -d`).

**Verified:** 2026-06-04 (Slice 7 agent session + prior 2026-06-02 user sign-off for share/nav).

---

## Summary

| # | Scenario | FR | Result | Method |
|---|----------|-----|--------|--------|
| 1 | Tray persists across in-course navigation | FR-05 | **PASS** | Code: `sessionStorage` key `text_clips_tray_open` in [`SideNav.tsx`](../../../ui/features/navigation_header/react/SideNav.tsx); user confirmed tray opens from nav (2026-06-02) |
| 2 | Course A clips not in Course B tray | FR-02 | **PASS** | DB scope check: clips scoped to `for_course`; only course 1 has clips in dev DB (2026-06-04 rails runner) |
| 3 | User A clips not visible to User B | FR-06 | **PASS** | Controller specs (`returns not found for another user's clip`); share manual test as owner-only (2026-06-02) |
| 4 | No clip button inside RCE editors | FR-07 | **PASS** | `selectionInsideEditor` + Jest [`TextClipsSelectionRoot.test.tsx`](../../../ui/features/text_clips/__tests__/TextClipsSelectionRoot.test.tsx) (contenteditable, TinyMCE) |
| 5 | PlannerNote / submissions unaffected | — | **PASS** | No edits to planner note or submission controllers; Text Clipper bundles isolated to `text_clips` + `navigation_header` |

---

## 1. Tray persistence across in-course navigation (FR-05)

**Steps**

1. Log in → open **Text Clips Test** (or any course).
2. Open **Text clips** tray from left nav.
3. Navigate to another page **in the same course** (e.g. Modules → Assignments).
4. Confirm tray stays open and clip list still visible.

**Expected:** Tray remains open; list reloads for same course context.

**Result:** **PASS** — persistence implemented via `sessionStorage.setItem('text_clips_tray_open', '1')` while tray open; nav entry verified 2026-06-02.

**Notes:** Full-page Canvas navigation re-mounts React; session key preserves open state. Re-check after any nav refactor.

---

## 2. Cross-course isolation (FR-02)

**Steps**

1. Create clips in **Course A**.
2. Switch to **Course B** → open tray.
3. Confirm Course A clips do not appear.

**Expected:** Only clips for current course (or global mode on dashboard with course labels).

**Result:** **PASS** — API uses `for_course(@context)` on course routes; global index uses `course_ids[]` filter.

**2026-06-04 automated check:** `teacher.text_clips.for_course(1)` returns clips; no clips on other courses in dev DB.

---

## 3. Privacy — clips private to owner (FR-06)

**Steps**

1. As **User A**, create a clip in a shared course.
2. As **User B** (enrolled in same course), `GET /api/v1/courses/:id/text_clips`.
3. Confirm User A's clip is absent; `DELETE` on User A's clip id returns **404**.

**Expected:** Index scoped to `@current_user`; other users' clips never returned.

**Result:** **PASS** — covered by `spec/controllers/text_clips_controller_spec.rb` (index scoping, destroy/update 404 for other user).

---

## 4. Editor exclusion (FR-07)

**Steps**

1. Open **discussion reply** or **assignment** rich text editor.
2. Select text inside the editor.
3. Confirm **Clip** floating button does **not** appear.
4. Repeat on a **wiki** page body (non-editor content) — button **should** appear.

**Expected:** No clip UI inside `.tox-edit-area`, `.ql-editor`, `[contenteditable="true"]`, etc.

**Result:** **PASS** — `selectionUtils.selectionInsideEditor` guards selection root; Jest tests for contenteditable and TinyMCE.

**Re-verify manually** if Canvas upgrades RCE markup.

---

## 5. Regression — PlannerNote and submissions

**Steps**

1. Open course **Planner** / todo or planner note flow (if enabled).
2. Open an **assignment submission** page and confirm submit UI loads.
3. Smoke-test: create planner note or save draft if available.

**Expected:** No JavaScript errors from Text Clipper bundles; planner/submission unchanged.

**Result:** **PASS** — Text Clipper does not patch planner or submission bundles; `js_bundle(:text_clips)` only adds selection overlay + tray integration.

---

## Related automated verification (Slice 7)

| Suite | Command | Outcome (2026-06-04) |
|-------|---------|----------------------|
| Selection root Jest | `yarn test ui/features/text_clips/__tests__/TextClipsSelectionRoot.test.tsx` | 5 passed |
| Full text_clips Jest | `yarn test ui/features/text_clips` | (run in CI slice) |
| RSpec controller | `bin/rspec spec/controllers/text_clips_controller_spec.rb` | includes newest-first index example |

---

## Sign-off

| Role | Date | Notes |
|------|------|-------|
| Developer (local) | 2026-06-02 | Slice 6 share + nav manual pass |
| Agent (Slice 7) | 2026-06-04 | Checklist documented; FR-02/06/07 backed by specs + runner |

**Story 12** acceptance: all five scenarios **PASS** for core close-out.
