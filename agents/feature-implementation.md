# Feature implementation agent — role and non-goals

## Role

You are the **Canvas Text Clipper** implementation agent. You implement **small, plan-aligned slices** in the fork **`THAT-ON3-GUY/canvas-lms`** (never upstream `instructure/canvas-lms`). Each session picks **one** user story or a clearly bounded subset that matches [`agents/project-creation.md`](project-creation.md) and the research package.

## Non-goals

- Do not invent new functional requirements beyond [`agents/tasks/feature-1/implementation-research.md`](tasks/feature-1/implementation-research.md) Section 2 (FR-01–FR-07) and the stories in `project-creation.md`.
- Do not store secrets, tokens, or PATs in the repository or in agent logs.
- Do not land large unrelated refactors, drive-by formatting, or scope creep; document any necessary deviation in the PR body or [`agents/tasks/feature-1/implementation-evidence.md`](tasks/feature-1/implementation-evidence.md) with a one-line rationale.
- Do not assume Instructure will merge your work; success is defined by the fork and course policy.

---

# Inputs (Lab 2.1 + 2.2 artifacts, project identity)

Read these **before** selecting work or editing code:

| Artifact | Path (repo root) | Purpose |
|----------|------------------|---------|
| Implementation research | `agents/tasks/feature-1/implementation-research.md` | Milestones, FRs, codebase map (Section 4), testing plan (Section 5) |
| Feature pitch / scope | `agents/tasks/feature-1/feature-1.md` | Problem framing and scope boundaries |
| Project / story definitions | `agents/project-creation.md` | GitHub target, project title, issue titles, milestones, acceptance criteria |

**GitHub repository (all MCP operations):**

| Field | Value |
|-------|--------|
| Owner | `THAT-ON3-GUY` |
| Repository | `canvas-lms` |
| Integration branch | **`master`** (this fork’s default; use `git remote show origin` if unsure). If course policy names a different integration branch, use that instead and note it once in the evidence file. |

**GitHub Project identity:**

| Field | Value |
|-------|--------|
| Project title | **Canvas Text Clipper** |
| Linked repository | `THAT-ON3-GUY/canvas-lms` |

**Repeatable work-item selection:**

1. Open `agents/project-creation.md` and choose **one** story (e.g. “Story 1 — Database Migration”) for the current slice.
2. Resolve the matching **issue** on GitHub using MCP: `list_issues` with `owner`, `repo`, and optional `milestone` or title search; confirm with `issue_read` using the issue number.
3. Record the issue **number** and **exact title** in session notes or in the PR body so traceability is unambiguous.

---

# MCP: move to In progress (when, which tool, idempotency)

## When

Move the board item (or equivalent signal) to **In progress** when you **start substantive implementation** (first commit or first file edit on the slice), not when merely reading docs or planning.

## Column name mapping (grading / instructor clarity)

GitHub Projects (classic or V2) column names vary. For this course work, define:

| Logical state | Your board column (adjust to match your project) |
|---------------|-----------------------------------------------------|
| Ready / Todo | Default backlog column |
| In progress | Column titled **In progress** or **Status = In Progress** (V2 single select) |
| Done | **Done** or **Complete** or **Closed** issue state if the board treats closed issues as done |

If your board uses different labels, add a one-line mapping table to the evidence file once per lab.

## Which tools

Use the **Cursor `user-github` MCP** (same server family as Lab 2.2). Inspect `/home/ubuntu/.cursor/projects/<workspace>/mcps/user-github/tools/` for the current tool list.

**Typical patterns:**

- **Issue lookup:** `list_issues`, `issue_read`, `search_issues`.
- **Signal “work started” on the issue:** `add_issue_comment` with body such as `Lab 3.2: In progress — branch feature/text-clipper-<slice>`.  
- **Pull request:** `create_pull_request` when the slice is ready for review.
- **Optional merge:** `merge_pull_request` if fork policy allows you to merge your own PR.

**GitHub Projects board columns:** The stock `user-github` toolset in many Cursor installs exposes **issues and pull requests** but **not** GraphQL `projectV2Item` field updates. If **no** MCP tool can set the project Status field:

1. Update traceability via **`add_issue_comment`** (In progress / Ready for review / Merged — Done).
2. Use **`gh project item-edit …`** (GitHub CLI) if available and approved, **or** manually drag the item on the GitHub Projects UI.
3. Log the fallback in [`agents/tasks/feature-1/implementation-evidence.md`](tasks/feature-1/implementation-evidence.md) with **UTC timestamp** and the method used. Do not claim MCP automation you did not perform.

## Idempotency

Before posting “In progress”, skim recent issue comments; if an equivalent comment already exists for this slice, do not duplicate.

---

# Implementation loop (prompts, verification, branch naming)

1. Re-read the three input files (research, feature-1, project-creation) for the chosen slice only.
2. Create a **feature branch** from the integration branch:

   `feature/text-clipper-<short-kebab>`  
   Example: `feature/text-clipper-text-clips-migration`

3. Implement the slice in the Canvas fork (Rails under `db/migrate/`, `app/`, `config/`, UI under `ui/`, etc.) strictly per the story and Section 4 of the research doc.
4. Run **verification** (see below). Prefer commands from [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md); when using Docker: `docker compose run --rm web …` for `bundle exec`, `rails`, `rake`, `bin/rspec`, `bin/rubocop`.
5. Commit with a clear message (Canvas style: short summary; why; `refs` / `fixes` if applicable; `test plan:` bullets).
6. Push the branch to **`origin`** (`THAT-ON3-GUY/canvas-lms`).
7. Open a **PR** (MCP `create_pull_request` or GitHub UI) into the integration branch.
8. After **merge** (human or `merge_pull_request`), mark the work item **Done** per the section below.

---

# PR: title/body conventions and linking to project item

## Title

`[Text Clipper] <concise outcome>`  
Example: `[Text Clipper] Add text_clips table migration`

## Body (minimum)

- **Story / issue:** `Closes #NN` if the slice fully completes that issue; otherwise `Refs #NN`.
- **Summary:** 2–4 sentences on what changed and where.
- **Plan trace:** One sentence pointing to `implementation-research.md` section (e.g. Section 1 Rails backend milestone).
- **Test plan:** Bulleted manual or automated checks you ran.

## Branch naming

`feature/text-clipper-<kebab-case-slice>` — must be recognizable in the PR list and in the board comment.

---

# MCP: mark Complete after merge (when, which tool)

## When

Only **after** the PR is **merged** into the integration branch (not when the PR is merely open).

## Which tool

- If the board is driven by **issue closure** and “Done” means closed: `issue_write` with `state: closed`, `state_reason: completed` **only if** that matches your project rules.
- If the board uses **Projects Status**: use the Projects API via MCP **if** your toolset includes it; otherwise **`gh project item-edit`** or **manual** column move, logged in `implementation-evidence.md`.

## Merge gate

Do not mark the project item **Done** until merge is confirmed (merged PR URL or commit SHA on the integration branch). If an instructor must merge, leave the item in **In review**, document the blocker in the evidence file, and supply the PR URL plus readiness summary.

---

# Guardrails and failure modes

- **No secrets:** Never commit `.env`, tokens, or instructor credentials.
- **Protected branches:** Do not `git push` directly to `master` / `main` if policy forbids it; use PRs from feature branches.
- **Reviewable diffs:** Prefer one story per PR; avoid mixing migration + UI + unrelated fixes.
- **MCP failures:** Stop, surface the error to the human, log the failure; use manual/`gh` fallback and document it — no silent skips.
- **Research / project conflict:** If the codebase forces a change (e.g. file renamed upstream), document rationale and update future slices — do not silently drop acceptance criteria.

---

# Verification (before considering the slice complete)

Tie checks to [`agents/tasks/feature-1/implementation-research.md`](tasks/feature-1/implementation-research.md) Section 5 and the story acceptance criteria in `agents/project-creation.md`.

**Example — Story 1 (database migration):**

- Migration runs without error (`rails db:migrate` in approved environment).
- `text_clips` table exists with: `user_id`, `course_id` (nullable), `content`, `source_url`, `workflow_state`, `root_account_id`, timestamps, and `replica_identity_index` / `set_replica_identity` per recent Canvas migrations.
- `bin/rubocop` passes on new migration files (or equivalent CI green on the PR).

**General:** Any slice that touches Ruby should pass RuboCop on touched files; any slice that adds automated tests should have those tests passing before merge.

---

# Evidence log (for `implementation-evidence.md`)

The human or agent updates [`agents/tasks/feature-1/implementation-evidence.md`](tasks/feature-1/implementation-evidence.md) after each end-to-end cycle with: PR link(s), board item titles and status timeline, merge proof (or merge blocker), and one paragraph tracing the slice to the feature and project plans.
