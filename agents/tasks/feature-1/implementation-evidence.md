# Implementation evidence — Lab 3.2 (Canvas Text Clipper)

**Narrative progress (Slice 5 onward, dev setup, manual QA):** [`progress-slice-5-onward.md`](progress-slice-5-onward.md) — use that file as the main Cursor reference on another machine.

## PR links

| PR | Description |
|----|-------------|
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/17 | Adds `text_clips` predeploy migrations (`CreateTextClips`, `SetReplicaIdentityOnTextClips`), `agents/feature-implementation.md`, and canonical `agents/tasks/feature-1/{implementation-research,feature-1}.md`. (This evidence file landed on `master` in a follow-up commit: https://github.com/THAT-ON3-GUY/canvas-lms/commit/f9c6e7a9249ac82206b44579131253a5236e81b8.) |
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/19 | **Stories 3–4:** `TextClipsController` (`index`, `create`, `destroy`), course-nested API routes under `/api/v1/courses/:course_id/text_clips`, `has_many :text_clips` on `User`; partial Story 10 controller specs. |
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/21 | **Slice 5 — Global clips view:** `/api/v1/users/self/text_clips`, global SideNav + tray mode, off-course selection clip (`course_id: nil`), layout bundle for all logged-in pages, `for_courses` scope, course stub in JSON. Refs #5, #7, #8, #9, #16; more Story 10 coverage. |
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/22 | **Slice 6 — Read-only share links:** `text_clip_shares`, owner `POST/DELETE .../share`, anonymous `GET /text_clips/shared/:token`, tray share UI (create/copy/revoke). Refs #5, #7, #10, #11. |
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/23 | **Nav + progress doc:** classic nav Text clips entry, OldSideNav tray, InstUI header mount, `progress-slice-5-onward.md`. Merge `4b1ada9aebb`. |
| https://github.com/THAT-ON3-GUY/canvas-lms/pull/24 | **Slice 7 — Core close-out:** `TextClipsSelectionRoot` Jest (FR-01/FR-07), index newest-first RSpec, Story 12 manual checklist, closed issues #5–#16. Closes #10, #11, #12. |

## Board: item titles and status timeline

| Item | Before | After | When (UTC) | Method |
|------|--------|-------|------------|--------|
| GitHub Issue **#1** — *Create text_clips database migration* | `open` | `closed` (`completed`) | 2026-05-14 ~16:49 | PR #17 body contained `Closes #1`; GitHub closed the issue on squash merge to `master`. |
| GitHub Project **Canvas Text Clipper** — same work item (board column) | *Not updated via MCP* (no `projectV2` tools in this Cursor `user-github` server) | **Manual / UI:** move card to **In progress** when work started, then to **Done** after merge | 2026-05-14 | Traceability: `add_issue_comment` on #1 for **In progress** (https://github.com/THAT-ON3-GUY/canvas-lms/issues/1#issuecomment-4452736354) and **Done** (https://github.com/THAT-ON3-GUY/canvas-lms/issues/1#issuecomment-4452748124). Instructor should align project board columns with comments if needed. |

**Column mapping (for grading):** Logical **In progress** = work actively being implemented (signaled by issue comment + human board drag if used). Logical **Done** = PR merged to integration branch `master` + issue closed completed.

## Merge evidence

- **Merged PR:** https://github.com/THAT-ON3-GUY/canvas-lms/pull/17  
- **Merge result:** Squash merge succeeded via GitHub MCP `merge_pull_request`; merge commit on `master`: `33dcd8fe849c87c049d19fdf587b5cbd4eac4b20` (https://github.com/THAT-ON3-GUY/canvas-lms/commit/33dcd8fe849c87c049d19fdf587b5cbd4eac4b20).

## Trace to feature + project plan

This slice delivers **Story 1 — Database Migration** from [`agents/project-creation.md`](../../project-creation.md) (Rails Backend milestone): the `text_clips` table with required columns, nullable `course_id`, `workflow_state` for soft-delete alignment with [`agents/tasks/feature-1/implementation-research.md`](implementation-research.md) Section 1 (Rails backend before React/API work) and Section 4 (migrations under `db/migrate/`), satisfying the story acceptance criteria and supporting downstream FR-01 persistence without inventing new scope beyond the research package.

## Controller + routes slice (Stories 3–4, partial 10)

### Board: item titles and status timeline

| Item | Before | After | When (UTC) | Method |
|------|--------|-------|------------|--------|
| GitHub Issue **#3** — *Create TextClipsController* | `open` | `closed` (`completed`) | 2026-05-19 | PR #19 body `Closes #3`; squash merge to `master`. |
| GitHub Issue **#4** — *Add API routes for text clips* | `open` | `closed` (`completed`) | 2026-05-19 | PR #19 body `Closes #4`. |
| GitHub Issue **#10** — *RSpec tests* | `open` | `open` (partial) | 2026-05-19 | PR #19 body `Refs #10` — controller spec only; model specs in PR #18. |
| GitHub Project **Canvas Text Clipper** | *Not updated via MCP* | **Manual / UI:** align board with issue comments | 2026-05-19 | In-progress comments on #3/#4 earlier; QA-green comments pre-merge (see below). |

### Merge evidence

- **Merged PR:** https://github.com/THAT-ON3-GUY/canvas-lms/pull/19  
- **Merge commit on `master`:** `d8710e62e23350b0cc52e06a7b11a3c376c717f0` (https://github.com/THAT-ON3-GUY/canvas-lms/commit/d8710e62e23350b0cc52e06a7b11a3c376c717f0)

### Trace to feature + project plan

Delivers **Story 3** (controller CRUD + auth/scoping) and **Story 4** (course-nested v1 API routes) per [`agents/project-creation.md`](../../project-creation.md) and [`implementation-research.md`](implementation-research.md) Section 1–2; shard-aware queries and user-scoped clips match research patterns (`PlannerNotesController`-style). Unblocks React tray (Stories 5–9) and remaining Story 10 coverage.

## Slice 5 — Global clips view

### Scope delivered

- **API:** `GET/POST/PUT/DELETE` + `undestroy` under `/api/v1/users/:user_id/text_clips`; `course_ids[]` filter on global index; `course` stub on clip JSON.
- **UI:** SideNav bookmark on every page; tray `course` vs `global` mode; course chip filter + per-clip course labels in global mode; selection overlay saves via global POST when `ENV.COURSE_ID` is absent.
- **Cross-cutting:** `js_bundle(:text_clips)` for any `@current_user`; `TextClip#resolves_root_account` user fallback; `scope :for_courses`.

### Merge evidence

- **Merged PR:** https://github.com/THAT-ON3-GUY/canvas-lms/pull/21  
- **Merge commit on `master`:** `97c58ae454466df8fc5fda4943e9f7a9df73a563` (https://github.com/THAT-ON3-GUY/canvas-lms/commit/97c58ae454466df8fc5fda4943e9f7a9df73a563)

### Board / issues

| Item | Notes |
|------|--------|
| **#5** TextClipsTray | Global mode + course filter strip |
| **#7** API helper | `globalTextClipsIndexPath`, `createGlobalTextClip`, etc. |
| **#8** Selection listener | Works off-course pages |
| **#9** SideNav toggle | Visible outside courses; single `text_clips_tray_open` key |
| **#16** js_bundle wiring | Relaxed from course-only to all logged-in pages |
| **#10** RSpec | Extended model + controller specs for global routes |

**Projects board:** Manual alignment if MCP `projectV2` unavailable.

### Trace

Exposes nullable `course_id` from Story 1 as a **personal cross-course collection** per [`.cursor/plans/text_clipper_slice_5.plan.md`](../../../.cursor/plans/text_clipper_slice_5.plan.md); updates FR-04/FR-05 behavior (tray stays open across navigation via global session key).

## Slice 6 — Read-only share links

### Scope delivered

- **Data:** `text_clip_shares` (token, soft-delete, one active share per clip); `TextClipShare` + `TextClip#active_share`.
- **API:** `POST/DELETE .../text_clips/:id/share` (course + `users/self`); owner JSON includes `share: {token, url}`.
- **Public:** `GET /text_clips/shared/:token` (no login); HTML + JSON omit `note`, tags, `user_id`.
- **UI:** Tray per-clip share panel (create link, copy, stop sharing, shared badge) in course and global modes.

### Merge evidence

- **Merged PR:** https://github.com/THAT-ON3-GUY/canvas-lms/pull/22  
- **Merge commit on `master`:** `b9dfadfcbad4521e902ffb387825ab205d9aeeec` (https://github.com/THAT-ON3-GUY/canvas-lms/commit/b9dfadfcbad4521e902ffb387825ab205d9aeeec)

### Board / issues

| Item | Notes |
|------|--------|
| **#5** TextClipsTray | Share panel, copy, revoke, shared badge |
| **#7** API helper | `shareTextClip`, `unshareTextClip`, global variants |
| **#10** RSpec | `text_clip_share_spec`, share/unshare + `shared_text_clips` controller specs |
| **#11** Jest | Tray share tests + `api.test.ts` share paths |

**Projects board:** Manual alignment if MCP `projectV2` unavailable.

### Trace

First outward-facing clip capability per [`.cursor/plans/text_clipper_slice_6_31ac498c.plan.md`](../../../.cursor/plans/text_clipper_slice_6_31ac498c.plan.md); Eportfolio-style secret token, revocable per clip.

### Manual verification (Slice 6)

| Check | Result | When |
|-------|--------|------|
| Create share link from tray; copy URL | Pass | 2026-06-02 |
| Incognito / logged-out shared page (public fields only) | Pass | 2026-06-02 |
| Stop sharing → reload shared URL → 404 | Pass | 2026-06-02 |

Details and step-by-step checklist: [`progress-slice-5-onward.md`](progress-slice-5-onward.md) § Slice 6 manual verification.

## Post-merge dev session (2026-06-02) — nav + Docker

Merged in **PR #23** (`4b1ada9aebb`).

### Problem

`instui_nav` enabled in DB but browser often showed **classic** left nav (Account, Dashboard, Courses, …) with **no** Text clips entry. InstUI `SideNav` only mounts when `ENV.FEATURES.instui_nav` is true **and** `navigation_header` webpack bundles load.

### Root causes found

1. **`webpack` container exited** after initial compile when `docker compose up` ran in the foreground (terminal killed → services stopped).
2. **Stale Redis** `rails80:js_env_account_features/*` cached `instui_nav: false` in page ENV.
3. **Classic ERB nav** had no Text clips row; tray wiring lived only in InstUI `SideNav` / `OldSideNav` click handlers.

### Fixes applied locally

| File | Purpose |
|------|---------|
| `app/views/shared/_new_nav_header.html.erb` | Server-rendered “Text clips” above Help |
| `ui/features/navigation_header/react/OldSideNav.tsx` | Open `TextClipsTray` from `#global_nav_text_clips_link` |
| `ui/features/navigation_header/index.tsx` | Mount InstUI `SideNav` into `#header` when `instui_nav` |
| `ui/features/navigation_header/react/utils.ts` | Tray label for `text_clips` |
| `app/stylesheets/base/_SideNav.scss` | `#text-clips-tray` styles |
| `config/feature_flags/app_fundamentals_release_flags.yml` | `instui_nav` allowed in development |

### Ops that restored a working dev UI

```bash
docker compose up -d
docker compose exec -T redis redis-cli --scan --pattern 'rails80:js_env_account_features*' | xargs -r docker compose exec -T redis redis-cli DEL
docker compose up -d webpack
docker compose restart web
# browser: hard refresh http://localhost:3000
```

**Verified:** Text clips visible in left nav; Slice 6 share manual checklist passed. Full write-up: [`progress-slice-5-onward.md`](progress-slice-5-onward.md).

## Slice 7 — Core close-out (testing + Story 12 + issues)

### Scope delivered

- **Jest:** [`TextClipsSelectionRoot.test.tsx`](../../../ui/features/text_clips/__tests__/TextClipsSelectionRoot.test.tsx) — course vs global save, error path, FR-07 editor suppression.
- **RSpec:** `GET #index` returns clips **newest first** (`travel_to` example in `text_clips_controller_spec.rb`).
- **Manual:** [`manual-verification-checklist.md`](manual-verification-checklist.md) — all five Story 12 scenarios **PASS** (2026-06-04).
- **Issues:** Closed **#5–#16** on `THAT-ON3-GUY/canvas-lms` with PR traceability comments (#1–#4 were already closed).

### Board / issues

| Item | Notes |
|------|--------|
| **#10** RSpec | Model, controller, share, tag specs complete |
| **#11** Jest | Tray, selection root, SelectionClipButton, api |
| **#12** Manual checklist | Documented and signed off |
| **#5–#9, #13–#16** | Shipped in slices 2–6 + PR #23; closed with comments |

### Trace

Closes the original **Testing & Verification** milestone and FR-01–FR-07 acceptance without new product scope. Deferred: feature-flag rollout, `/text_clips` page, polish slice.
