# QA lab evidence — Lab 4.1 (Canvas Text Clipper)

## Work items

| Item | PR | Tests added / updated | Command | Outcome | Trace |
|------|-----|----------------------|---------|---------|-------|
| **#2** — Create TextClip Rails model | https://github.com/THAT-ON3-GUY/canvas-lms/pull/18 | `app/models/text_clip.rb`; `spec/models/text_clip_spec.rb` (validations, nullable `course_id`, soft delete, `for_user`, `for_course`) | `docker compose run --rm web bin/rspec spec/models/text_clip_spec.rb` | **6 examples, 0 failures** (also `bin/rubocop` on model + spec: no offenses) | Story 2 / Rails Backend milestone; FR-06 prep via `for_user`; partial Story 10 model specs. Merge: https://github.com/THAT-ON3-GUY/canvas-lms/commit/dbfac053a8172aa35943ce26bc6f65f824460ca4 |
| **Lab 4.1 docs** — `agents/quality-assurance.md`, this evidence file | https://github.com/THAT-ON3-GUY/canvas-lms/commit/dbfac053a8172aa35943ce26bc6f65f824460ca4 (QA agent shipped in PR #18); evidence follow-up on `master` after merge | — | — | **No automated test** — agent markdown and evidence only; no runtime behavior to exercise. | Lab 4.1 deliverable; supports repeatable QA workflow per course spec. |

## Board / issue timeline (#2)

| When (UTC) | Status | Method |
|------------|--------|--------|
| 2026-05-19 | In progress | `add_issue_comment` — https://github.com/THAT-ON3-GUY/canvas-lms/issues/2#issuecomment-4490008698 |
| 2026-05-19 | QA green (pre-merge) | `add_issue_comment` — https://github.com/THAT-ON3-GUY/canvas-lms/issues/2#issuecomment-4490011996 |
| 2026-05-19 | Done | PR #18 squash-merged; issue **#2** closed `completed` |

**Projects board:** No `projectV2` MCP tool in this workspace — move the **Canvas Text Clipper** card manually to match the issue comments if columns differ from issue state.

## Plan trace (Story 2)

This cycle followed [`agents/feature-implementation.md`](../../feature-implementation.md) for implementation and [`agents/quality-assurance.md`](../../quality-assurance.md) for test gating: model code landed per [`agents/project-creation.md`](../../project-creation.md) Story 2 and [`implementation-research.md`](implementation-research.md) Section 4–5; QA required green `bin/rspec` before merge, satisfying Lab 4.1 “tests on completion where it makes sense” for behavior-changing Ruby code.
