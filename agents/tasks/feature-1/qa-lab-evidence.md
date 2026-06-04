# QA lab evidence — Lab 4.1 (Canvas Text Clipper)

**Slice 5+ narrative, dev environment, manual sign-off:** [`progress-slice-5-onward.md`](progress-slice-5-onward.md).

## Work items

| Item | PR | Tests added / updated | Command | Outcome | Trace |
|------|-----|----------------------|---------|---------|-------|
| **#2** — Create TextClip Rails model | https://github.com/THAT-ON3-GUY/canvas-lms/pull/18 | `app/models/text_clip.rb`; `spec/models/text_clip_spec.rb` (validations, nullable `course_id`, soft delete, `for_user`, `for_course`) | `docker compose run --rm web bin/rspec spec/models/text_clip_spec.rb` | **6 examples, 0 failures** (also `bin/rubocop` on model + spec: no offenses) | Story 2 / Rails Backend milestone; FR-06 prep via `for_user`; partial Story 10 model specs. Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/dbfac053a8172aa35943ce26bc6f65f824460ca4 |
| **Lab 4.1 docs** — `agents/quality-assurance.md`, this evidence file | https://github.com/THAT-ON3-GUY/canvas-lms/commit/dbfac053a8172aa35943ce26bc6f65f824460ca4 (QA agent shipped in PR #18); evidence follow-up on `master` after merge | — | — | **No automated test** — agent markdown and evidence only; no runtime behavior to exercise. | Lab 4.1 deliverable; supports repeatable QA workflow per course spec. |
| **#3**, **#4** — TextClipsController + API routes | https://github.com/THAT-ON3-GUY/canvas-lms/pull/19 | `app/controllers/text_clips_controller.rb`; `spec/controllers/text_clips_controller_spec.rb`; `config/routes.rb`; `User#has_many :text_clips` | `docker compose run --rm web bin/rspec spec/controllers/text_clips_controller_spec.rb` | **7 examples, 0 failures** (`bin/rubocop` on controller, spec, routes: no offenses) | Stories 3–4; partial Story 10. Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/d8710e62e23350b0cc52e06a7b11a3c376c717f0 |
| **Slice 5** — Global clips view | https://github.com/THAT-ON3-GUY/canvas-lms/pull/21 | Global routes + controller refactor; `TextClipsTray` global mode; `api.ts` global helpers; `SideNav` always-on bookmark; `TextClipsSelectionRoot` | `docker compose run --rm web bin/rspec spec/models/text_clip_spec.rb spec/controllers/text_clips_controller_spec.rb`; `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx`; `yarn check:ts` | **55 RSpec examples, 0 failures**; **33 Jest tests, 0 failures**; rubocop clean on touched Ruby | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/97c58ae454466df8fc5fda4943e9f7a9df73a563 |
| **Slice 6** — Read-only share links | https://github.com/THAT-ON3-GUY/canvas-lms/pull/22 | `text_clip_shares` migration/model; `share`/`unshare` + `SharedTextClipsController`; tray share UI; API helpers | `docker compose run --rm web bin/rspec spec/models/text_clip_share_spec.rb spec/controllers/text_clips_controller_spec.rb spec/controllers/shared_text_clips_controller_spec.rb`; `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx`; `yarn check:ts` | **44 RSpec examples, 0 failures**; **39 Jest tests, 0 failures**; rubocop clean on touched Ruby | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/b9dfadfcbad4521e902ffb387825ab205d9aeeec |
| **Slice 7** — Core close-out | https://github.com/THAT-ON3-GUY/canvas-lms/pull/24 | `TextClipsSelectionRoot.test.tsx`; `manual-verification-checklist.md`; index newest-first RSpec; closed issues #5–#16 | `yarn test ui/features/text_clips`; `bin/rspec spec/controllers/text_clips_controller_spec.rb` | **44 Jest**, **38 RSpec**, 0 failures; `yarn check:ts` pass | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/28654a2ce0f |
| **Slice 8** — Full-page /text_clips | https://github.com/THAT-ON3-GUY/canvas-lms/pull/25 | `TextClipsPagesController`, `text_clips_page` bundle, tray reuse, View all clips link | `yarn test ui/features/text_clips_page`; `bin/rspec spec/controllers/text_clips_pages_controller_spec.rb` | **25 Jest**, **2 RSpec**, 0 failures | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/cf75128c12e |
| **Slice 9** — Highlight restore | https://github.com/THAT-ON3-GUY/canvas-lms/pull/26 | `highlightRestore.ts`, bundle hook, tray source href fragment | `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx`; `yarn check:ts` | **54 Jest**, 0 failures | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/751a8a30c8cd83141c5463880589d4fbbd74df74 |
| **Slice 10** — Pin & sort | https://github.com/THAT-ON3-GUY/canvas-lms/pull/27 | `pinned_at` migration, `ordered` scope, tray sort + pin UI | `bin/rspec spec/controllers/text_clips_controller_spec.rb spec/models/text_clip_spec.rb`; `yarn test` text_clips + tray; `yarn check:ts` | **67 RSpec**, **57 Jest**, 0 failures | Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/668650a4277e7d06987c8c7877bcf31aab68d6e4 |

## Board / issue timeline (#2)

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-05-19 | In progress | `add_issue_comment` — https://github.com/THAT-ON3-GUY/canvas-lms/issues/2#issuecomment-4490008698 |
| 2026-05-19 | QA green (pre-merge) | `add_issue_comment` — https://github.com/THAT-ON3-GUY/canvas-lms/issues/2#issuecomment-4490011996 |
| 2026-05-19 | Done | PR #18 squash-merged; issue **#2** closed `completed` |

**Projects board:** No `projectV2` MCP tool in this workspace — move the **Canvas Text Clipper** card manually to match the issue comments if columns differ from issue state.

## Plan trace (Story 2)

This cycle followed [`agents/feature-implementation.md`](../../feature-implementation.md) for implementation and [`agents/quality-assurance.md`](../../quality-assurance.md) for test gating: model code landed per [`agents/project-creation.md`](../../project-creation.md) Story 2 and [`implementation-research.md`](implementation-research.md) Section 4–5; QA required green `bin/rspec` before merge, satisfying Lab 4.1 “tests on completion where it makes sense” for behavior-changing Ruby code.

## Board / issue timeline (#3, #4)

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-05-19 | In progress | `add_issue_comment` on #3 and #4 (earlier in slice) |
| 2026-05-19 | QA green (pre-merge) | https://github.com/THAT-ON3-GUY/canvas-lms/issues/3#issuecomment-4491615730 , https://github.com/THAT-ON3-GUY/canvas-lms/issues/4#issuecomment-4491615857 |
| 2026-05-19 | Done | PR #19 squash-merged; issues **#3** and **#4** closed `completed` |

## Slice 5 QA (global clips)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web bin/rspec spec/models/text_clip_spec.rb spec/controllers/text_clips_controller_spec.rb` | **55 examples, 0 failures** |
| `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **33 tests, 0 failures** |
| `yarn check:ts` | pass |
| `bin/rubocop` on `text_clip.rb`, `text_clips_controller.rb`, `lib/api/v1/text_clip.rb` | no offenses |

Manual checklist: see [`.cursor/plans/text_clipper_slice_5.plan.md`](../../../.cursor/plans/text_clipper_slice_5.plan.md) § Manual verification.

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-02 | Done | PR #21 squash-merged to `master` |

## Slice 6 QA (read-only share links)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web bin/rspec spec/models/text_clip_share_spec.rb spec/controllers/text_clips_controller_spec.rb spec/controllers/shared_text_clips_controller_spec.rb` | **44 examples, 0 failures** |
| `yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **39 tests, 0 failures** |
| `yarn check:ts` | pass |
| `bin/rubocop` on `text_clip_share.rb`, `text_clips_controller.rb`, `shared_text_clips_controller.rb`, `lib/api/v1/text_clip.rb` | no offenses |

Manual checklist: [`.cursor/plans/text_clipper_slice_6_31ac498c.plan.md`](../../../.cursor/plans/text_clipper_slice_6_31ac498c.plan.md) § Verification (logged-out shared link, revoke → 404).

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-02 | Done | PR #22 squash-merged to `master` |

### Manual verification (Slice 6) — signed off

| Step | Expected | Result (2026-06-02) |
|------|----------|---------------------|
| Create link from tray | URL `/text_clips/shared/<token>`, copy works | **Pass** (developer) |
| Open link logged out | Content + source + course + date; no note/tags/edit | **Pass** |
| Stop sharing + reload | 404 | **Pass** |

Recorded in [`progress-slice-5-onward.md`](progress-slice-5-onward.md). API-only verification was also run earlier via `curl` / Rails runner during agent session.

## Slice 5+ dev UI QA (nav visibility)

| Check | Result (2026-06-02) |
|-------|---------------------|
| Text clips entry in left global nav | **Pass** after classic ERB item + `OldSideNav` wiring + `docker compose up -d` + Redis cache clear + webpack |
| Tray opens from nav click | **Pass** |
| Share flow still works end-to-end | **Pass** (same session as Slice 6 manual checklist) |

Nav follow-up merged in **PR #23** (`4b1ada9aebb`).

## Slice 7 QA (core close-out)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web yarn test ui/features/text_clips` | **PASS** (includes `TextClipsSelectionRoot.test.tsx`, 5 new tests) |
| `docker compose run --rm web yarn test ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **PASS** (regression) |
| `docker compose run --rm web yarn check:ts` | pass |
| `docker compose run --rm web bin/rspec spec/controllers/text_clips_controller_spec.rb` | **PASS** (+1 newest-first example) |
| `bin/rubocop spec/controllers/text_clips_controller_spec.rb` | no offenses |

Manual checklist: [`manual-verification-checklist.md`](manual-verification-checklist.md) — Story 12 scenarios 1–5 **PASS** (2026-06-04).

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-04 | Done | PR #24 squash-merged; issues **#5–#16** closed |

## Slice 8 QA (full-page /text_clips)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web yarn test ui/features/text_clips_page ui/features/text_clips` | **25 tests, 0 failures** |
| `docker compose run --rm web yarn test ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **20 tests, 0 failures** |
| `docker compose run --rm web yarn check:ts` | pass |
| `docker compose run --rm web bin/rspec spec/controllers/text_clips_pages_controller_spec.rb` | **2 examples, 0 failures** |
| `bin/rubocop` on new Ruby | no offenses |

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-04 | Done | PR #25 squash-merged to `master` |

## Slice 9 QA (highlight restore)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **54 tests, 0 failures** |
| `docker compose run --rm web yarn check:ts` | pass |

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-04 | Done | PR #26 squash-merged to `master` |

## Slice 10 QA (pin & sort)

| Command | Outcome |
|---------|---------|
| `docker compose run --rm web bin/rspec spec/controllers/text_clips_controller_spec.rb spec/models/text_clip_spec.rb` | **67 examples, 0 failures** |
| `docker compose run --rm web yarn test ui/features/text_clips ui/features/navigation_header/react/trays/__tests__/TextClipsTray.test.tsx` | **57 tests, 0 failures** |
| `docker compose run --rm web yarn check:ts` | pass |
| `bin/rubocop` on touched Ruby | no offenses |

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-06-04 | Done | PR #27 squash-merged to `master` |
