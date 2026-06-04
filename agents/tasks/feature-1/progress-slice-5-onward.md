# Text Clipper — progress from Slice 5 onward

**Primary reference for continuing work on another machine.** Open this file in Cursor after cloning/pulling `THAT-ON3-GUY/canvas-lms` on `master`.

Related evidence (automated tests / PR table):

- [`implementation-evidence.md`](implementation-evidence.md) — merge commits, board traceability, scope per PR
- [`qa-lab-evidence.md`](qa-lab-evidence.md) — RSpec/Jest commands and outcomes
- Plans: [`.cursor/plans/text_clipper_slice_5.plan.md`](../../../.cursor/plans/text_clipper_slice_5.plan.md) (global clips), slice 6 plan referenced in evidence (share links)

---

## Timeline (merged to `master`)

| When (UTC) | Slice | PR | Merge commit | Summary |
|------------|-------|-----|--------------|---------|
| 2026-06-02 | **5 — Global clips** | [#21](https://github.com/THAT-ON3-GUY/canvas-lms/pull/21) | `97c58ae4544` | Cross-course tray, `/users/self/text_clips`, off-course selection save |
| 2026-06-02 | **6 — Share links** | [#22](https://github.com/THAT-ON3-GUY/canvas-lms/pull/22) | `b9dfadfcbad` | Revocable public URLs, tray share UI |
| 2026-06-02 | Evidence on `master` | — | `0c61ad1ee34`, `6e270ef18c7` | Recorded slice 5/6 merges in evidence docs |

**Prerequisites on `master` before Slice 5:** Slices 1–4 (migration, model, controller, routes, tray UI, edit/notes/undo, tags/filtering) via PRs #17–#20. See [`implementation-evidence.md`](implementation-evidence.md) for earlier slices.

---

## Slice 5 — Global clips view (PR #21)

### Problem solved

Clips were course-only in the UI: SideNav bookmark only on course pages, tray scoped to one course. Slice 5 uses nullable `course_id` (from Story 1) for a **personal cross-course collection** visible from anywhere.

### Backend

| Area | Change |
|------|--------|
| Routes | `GET/POST/PUT/DELETE` + `undestroy` under `/api/v1/users/:user_id/text_clips` |
| Controller | `TextClipsController` supports course and global contexts; `course_ids[]` on global index |
| Model | `scope :for_courses`; `resolves_root_account` falls back to user when `course_id` is nil |
| Serializer | `course` stub `{id, name}` or null on each clip JSON |

### Frontend

| Area | Change |
|------|--------|
| Layout | `js_bundle(:text_clips)` for any logged-in user (not only in a course) |
| SideNav | `IconBookmarkLine` “Text clips” always in InstUI `SideNav` (not gated on course) |
| Tray | `mode`: `course` vs `global`; global uses `/users/self/text_clips`; course chip filter; per-row course label |
| Selection | `TextClipsSelectionRoot` saves via global POST when `ENV.COURSE_ID` absent (`course_id: null`) |
| API | `globalTextClipsIndexPath`, `createGlobalTextClip`, etc. in `ui/features/text_clips/api.ts` |

### Issues referenced

#5 (tray), #7 (API helpers), #8 (selection), #9 (SideNav), #16 (bundle wiring), #10 (partial RSpec).

### Automated QA (pre-merge)

| Command | Result |
|---------|--------|
| `docker compose run --rm web bin/rspec spec/models/text_clip_spec.rb spec/controllers/text_clips_controller_spec.rb` | 55 examples, 0 failures |
| `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | 33 tests, 0 failures |
| `yarn check:ts` | pass |
| `bin/rubocop` (touched Ruby) | no offenses |

### Manual verification (Slice 5)

From [slice 5 plan § Manual verification](../../../.cursor/plans/text_clipper_slice_5.plan.md):

1. Log in → open **Dashboard** (not in a course) → confirm **Text clips** in nav → open tray → see clips from multiple courses.
2. Use course filter chips → list narrows.
3. On a course page, tray still shows that course’s clips (course mode).
4. Select text on Dashboard → save to clips → clip appears with no course (or global list).
5. Navigate between pages with tray open → tray stays open (`text_clips_tray_open` session key).

---

## Slice 6 — Read-only share links (PR #22)

### Problem solved

Per-clip **“anyone with the link”** read-only view without login; owner can create, copy, and revoke links. Public payload excludes private fields.

### Backend

| Area | Change |
|------|--------|
| Migration | `text_clip_shares` (token, soft-delete, one active share per clip) |
| Model | `TextClipShare`; `TextClip#active_share`; `before_validation :assign_token` on create |
| Owner API | `POST/DELETE .../text_clips/:id/share` (course + `users/self` scopes) |
| Public | `GET /text_clips/shared/:token` — `SharedTextClipsController`, skip login; HTML + JSON |
| Serializer | Owner JSON: `share: {token, url}`; public JSON omits `note`, tags, `user_id` |

### Frontend

| Area | Change |
|------|--------|
| API | `shareTextClip`, `unshareTextClip` (+ global variants) |
| Tray | Per-clip share icon → Create link / Copy / Stop sharing; shared badge (course + global modes) |

### Bug fixed during implementation

Share creation returned **422** until token assignment moved to `before_validation :on => :create` (token was blank at validation time).

`SharedTextClipsController` uses `preload` (not `includes`) and shard-aware clip lookup per Canvas conventions.

### Issues referenced

#5, #7, #10 (RSpec), #11 (Jest).

### Automated QA (pre-merge)

| Command | Result |
|---------|--------|
| `docker compose run --rm web bin/rspec spec/models/text_clip_share_spec.rb spec/controllers/text_clips_controller_spec.rb spec/controllers/shared_text_clips_controller_spec.rb` | 44 examples, 0 failures |
| `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | 39 tests, 0 failures |
| `yarn check:ts` | pass |
| `bin/rubocop` (touched Ruby) | no offenses |

### Manual verification (Slice 6) — **PASSED 2026-06-02**

Confirmed by developer in local Docker Canvas:

1. **Create link** — Logged in → Text clips tray → share icon → Create link → URL `http://localhost:3000/text_clips/shared/<token>`; Copy works.
2. **Logged-out view** — Incognito / no session → open share URL → see content, source, course name, saved date; **no** note, tags, edit UI, or other clips.
3. **Revoke → 404** — Stop sharing in tray → reload share URL in incognito → **404** / not found.

Optional API check:

```bash
curl -i "http://localhost:3000/text_clips/shared/TOKEN.json"
```

---

## Dev environment (Docker) — lessons from Slice 5/6 testing

### Start Canvas (keep running after closing terminal)

```bash
cd /path/to/canvas-lms
docker compose up -d    # not bare `docker compose up` in foreground
docker compose ps       # web, webpack, postgres, redis, jobs should be Up
```

### URL and login

| Item | Value |
|------|--------|
| App URL | **http://localhost:3000** (`docker-compose.override.yml` maps `3000:80`) |
| Dev user | `raylaser2@gmail.com` (Site Admin pseudonym, account_id=2) — use your local password |
| Test course | **Text Clips Test** (course id `1`) |
| Sample clip | id `1` (used during API curl checks) |

### Frontend assets (why nav/JS sometimes “does nothing”)

- Built JS lives in Docker volume **`canvas-lms_public_dist`**, not necessarily host `./public/dist`.
- **`webpack` service** must be **Up** or run a one-shot build:

```bash
docker compose up -d webpack
# if nav bundles missing or stale:
docker compose run --rm web yarn webpack-development
docker compose restart web
```

- Hard refresh browser: **Ctrl+Shift+R** (Cmd+Shift+R on Mac).

### `instui_nav` feature flag

- Text clips in **InstUI** `SideNav` only apply when `ENV.FEATURES.instui_nav === true` **and** navigation_header JS runs.
- Enabled on accounts **1** (TextClipDev) and **2** (Site Admin) in dev.
- Stale Redis cache can serve `instui_nav: false` in the browser even when DB says on. Clear keys:

```bash
docker compose exec -T redis redis-cli --scan --pattern 'rails80:js_env_account_features*' \
  | xargs -r docker compose exec -T redis redis-cli DEL
```

Then hard refresh. Console check: `ENV.FEATURES.instui_nav`.

### Why classic nav appeared without Text clips

Classic left nav is server-rendered (`app/views/shared/_new_nav_header.html.erb`). InstUI `SideNav` replaces `#header` only when `instui_nav` JS loads. Typical causes: webpack stopped, stale `js_env` cache, or flag off in ENV.

---

## Follow-up work — nav visibility (local, not yet merged)

Uncommitted fixes on dev machine (2026-06-02) so **Text clips** appears in classic nav and opens the tray without relying on InstUI alone:

| File | Change |
|------|--------|
| `app/views/shared/_new_nav_header.html.erb` | “Text clips” menu item above Help (`#global_nav_text_clips_link`) |
| `ui/features/navigation_header/react/OldSideNav.tsx` | `text_clips` tray type + lazy `TextClipsTray` |
| `ui/features/navigation_header/react/utils.ts` | `getTrayLabel` for `text_clips` |
| `ui/features/navigation_header/index.tsx` | When `instui_nav`, mount `SideNav` into `#header` (not only hidden mobile container) |
| `app/stylesheets/base/_SideNav.scss` | `#text-clips-tray` styling |
| `config/feature_flags/app_fundamentals_release_flags.yml` | `instui_nav` `development: allowed_on` |

**Status:** Verified locally (“Text clips” visible above Help). **Next step:** commit on a branch + PR when ready.

```bash
git status   # should list the files above if not yet committed
```

---

## Commands cheat sheet

```bash
# Ruby tests (full text-clipper-related set as of slice 6)
docker compose run --rm web bin/rspec \
  spec/models/text_clip_spec.rb \
  spec/models/text_clip_share_spec.rb \
  spec/controllers/text_clips_controller_spec.rb \
  spec/controllers/shared_text_clips_controller_spec.rb

# JS tests
docker compose run --rm web yarn test ui/features/text_clips \
  ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx

# Typecheck / lint
docker compose run --rm web yarn check:ts
docker compose run --rm web bin/rubocop app/models/text_clip*.rb app/controllers/text_clips_controller.rb app/controllers/shared_text_clips_controller.rb
```

---

## Key files index (Slice 5 + 6)

| Concern | Paths |
|---------|--------|
| Global API | `app/controllers/text_clips_controller.rb`, `config/routes.rb`, `lib/api/v1/text_clip.rb` |
| Share API | `app/models/text_clip_share.rb`, `app/controllers/shared_text_clips_controller.rb`, `app/views/shared_text_clips/show.html.erb` |
| Tray UI | `ui/features/navigation_header/react/trays/TextClipsTray.tsx` |
| InstUI nav | `ui/features/navigation_header/react/SideNav.tsx`, `index.tsx` |
| Classic nav | `app/views/shared/_new_nav_header.html.erb`, `OldSideNav.tsx` |
| Client API | `ui/features/text_clips/api.ts`, `types.ts` |
| Selection save | `ui/features/text_clips/index.tsx` |
| Layout bundle | `app/views/layouts/application.html.erb`, `app/views/layouts/_head.html.erb` |

---

## Slice 7 — Core close-out (2026-06-04)

| Item | Detail |
|------|--------|
| PR | [#24](https://github.com/THAT-ON3-GUY/canvas-lms/pull/24) — merge `28654a2ce0f` |
| Jest | `TextClipsSelectionRoot.test.tsx` — FR-01 save + FR-07 editor guard |
| RSpec | Index **newest first** example |
| Manual | [`manual-verification-checklist.md`](manual-verification-checklist.md) — Story 12 **PASS** |
| Issues | **#5–#16** closed on fork with traceability comments |

**Core feature (FR-01–FR-07 + slices 1–7) is complete** for lab purposes.

## Slice 8 — Full-page /text_clips (2026-06-04)

| Item | Detail |
|------|--------|
| PR | [#25](https://github.com/THAT-ON3-GUY/canvas-lms/pull/25) — merge `cf75128c12e` |
| URL | http://localhost:3000/text_clips (logged in) |
| UX | Tray header **View all clips** → full page; page reuses `TextClipsTray` in global mode |

**Manual check:** Log in → open Text clips tray → click **View all clips** → confirm full-page list, search, tags, share work.

## Slice 9 — Highlight restore on source pages (2026-06-04)

| Item | Detail |
|------|--------|
| PR | [#26](https://github.com/THAT-ON3-GUY/canvas-lms/pull/26) — merge `751a8a30c8c` |
| UX | Tray/full-page **source** link appends `#text_clip_highlight=<snippet>`; destination page scrolls + ~4s yellow highlight |
| Miss | Info flash: “Couldn't find the clipped text on this page” |

**Manual check:** Clip text on a course page → tray → open source link → page scrolls/highlights; edit page to remove text → open source → info flash (no error).

## Slice 10 — Pin & sort clips (2026-06-04)

| Item | Detail |
|------|--------|
| PR | [#27](https://github.com/THAT-ON3-GUY/canvas-lms/pull/27) — merge `668650a4277` |
| UX | **Pin** clip to top (tray + `/text_clips`); **Sort** Recent / Oldest / Source |
| API | `GET .../text_clips?sort=oldest|source`; `PUT` with `pinned: true/false` |

**Manual check:** Pin a clip → it stays at top when sorting; unpin → normal order; sort Oldest/Source updates list (pinned still first).

## Slice 11 — Rich-content clipping (2026-06-04)

| Item | Detail |
|------|--------|
| PR | [#28](https://github.com/THAT-ON3-GUY/canvas-lms/pull/28) |
| UX | Clipping bold/links/lists preserves formatting in tray, full page, and shared link |
| API | `POST/PUT` accepts `content_html`; JSON includes sanitized `content_html` |

**Manual check:** Clip formatted text → tray shows HTML; share link renders formatting; edit plain text → rich view clears.

## What is not done yet (project backlog)

Per [`agents/project-creation.md`](../../project-creation.md):
- Production hardening, feature flag rollout, instructor board alignment via GitHub UI
- Polish / bug-fix slice (explicitly out of scope for Slice 7)

---

## Agent workflow reminders

- Implementation: [`agents/feature-implementation.md`](../../feature-implementation.md)
- QA gate: [`agents/quality-assurance.md`](../../quality-assurance.md)
- Fork only: `THAT-ON3-GUY/canvas-lms`; integration branch **`master`**
- Commit message format: see root `AGENTS.md` / `CLAUDE.md` (ChangeId, `refs`/`closes`, `flag=`, test plan)

---

*Last updated: 2026-06-04 — Slice 11 rich-content clipping.*
