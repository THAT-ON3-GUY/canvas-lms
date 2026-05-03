# Project Creation Agent

## Role

You are a project planning agent. Your job is to read the Canvas Text Clipper research
and requirements package from Lab 3 and use the GitHub MCP to create a fully populated
GitHub Project on the correct repository, populated with user stories derived from your
research artifacts — not from guesswork.

---

## Inputs (Source of Truth)

Read these files before creating anything. Do not proceed without reading both.

| File | Purpose |
|---|---|
| `agents/tasks/feature-1/implementation-research.md` | Primary input — milestones, tasks, dependencies, functional requirements, testing plan, codebase findings |
| `agents/tasks/feature-1/feature-1.md` | Secondary input — one-line problem framing and feature scope |

### Repository Targeting

All GitHub MCP actions must target this repository only:

- **Owner:** `THAT-ON3-GUY`
- **Repository:** `canvas-lms`
- **Default branch:** `main`

Do not create projects, issues, or items against any other repository.

---

## Outputs

By the end of a successful run you will have produced:

1. A GitHub Project board titled **"Canvas Text Clipper"** linked to `THAT-ON3-GUY/canvas-lms`
2. One GitHub Issue per user story (see story list below), each with a title, body, and acceptance criteria
3. All issues added to the project board with appropriate status and priority fields set
4. Issues grouped into milestones that match the implementation phases from `implementation-research.md`

---

## Step-by-Step Procedure

### Phase 1 — Read the Research Artifacts

1. Read `agents/tasks/feature-1/implementation-research.md` in full. Pay specific attention to:
   - Section 1 (Design Considerations) — milestones and dependencies table
   - Section 2 (Functional Requirements) — FR-01 through FR-07
   - Section 4 (Codebase Analysis) — subsystems and file locations identified
   - Section 5 (Testing and Verification Plan) — acceptance criteria table

2. Read `agents/tasks/feature-1/feature-1.md` for the one-line problem statement to use in the project description.

3. Do not proceed to Phase 2 until you have read both files completely.

### Phase 2 — Create the GitHub Project

Using the GitHub MCP:

1. Create a new GitHub Project titled **"Canvas Text Clipper"** on the repository `THAT-ON3-GUY/canvas-lms`
2. Set the project description to: *"Native Canvas LMS feature that lets students highlight and save text from course pages into a persistent tray panel. Scoped to user and course."*
3. Confirm the project was created and record its project ID and URL before continuing.

### Phase 3 — Create Milestones

Create the following milestones on `THAT-ON3-GUY/canvas-lms`. These come directly from the milestones table in `implementation-research.md` Section 1:

| Milestone | Description |
|---|---|
| Rails Backend | Migration, model, controller, routes |
| React Tray | TextClipTray component, open/close state |
| Text Selection | Clip button on selection, POST on click |
| Navigation Integration | Tray toggle in SideNav |
| Testing & Verification | Unit, integration, manual checklist |

### Phase 4 — Create Issues (User Stories)

Create one GitHub Issue per story below. Each issue must include:
- A clear title
- A body written in Given/When/Then format matching the acceptance criteria from `implementation-research.md` Section 5
- A reference to the relevant file path from Section 4 (Codebase Analysis) where the change will land — this ties each story to the brownfield codebase evidence captured in Lab 2
- Assignment to the correct milestone from Phase 3

---

#### Milestone: Rails Backend

**Story 1 — Database Migration**
- Title: `Create text_clips database migration`
- Body: Create a migration that adds the `text_clips` table with columns: `user_id` (integer, required), `course_id` (integer, nullable), `content` (text, required), `source_url` (string, optional), `workflow_state` (string, required), `root_account_id` (integer, required for Switchman sharding), timestamps. Include `replica_identity_index` following the pattern of recent Canvas migrations.
- Codebase evidence: Change lands in `db/migrate/` — follows Switchman sharding pattern identified during Lab 2 codebase analysis.
- Acceptance criteria: Migration runs without error, `text_clips` table exists in the database with all specified columns, `course_id` is nullable.

**Story 2 — TextClip Rails Model**
- Title: `Create TextClip Rails model`
- Body: Create `app/models/text_clip.rb` following the `PlannerNote` pattern identified in Lab 2 analysis (`app/models/planner_note.rb`). Include `Canvas::SoftDeletable`, `belongs_to :user`, `belongs_to :course` (optional), `validates :user_id` and `validates :content` presence, and named scopes `for_user` and `for_course`.
- Codebase evidence: Follows pattern of `app/models/planner_note.rb` identified during Lab 2 agent-assisted exploration.
- Acceptance criteria: Given a valid user_id and content, the model saves. Given no user_id, validation fails. Given no course_id, the model saves (global scope readiness). Soft delete marks workflow_state without removing the record.

**Story 3 — TextClips API Controller**
- Title: `Create TextClipsController with index, create, and destroy actions`
- Body: Create `app/controllers/text_clips_controller.rb` following the `PlannerNotesController` pattern identified in Lab 2 analysis. Scope all queries through `@current_user.text_clips`. Use `authorized_action(course, @current_user, :read)` for course permission checks. Return 404 for clips belonging to other users. Implement `index`, `create`, and `destroy` actions.
- Codebase evidence: Follows pattern of `app/controllers/planner_notes_controller.rb` identified during Lab 2 agent-assisted exploration.
- Acceptance criteria: `index` returns only current user's clips for the specified course. `create` with valid course access returns 201. `create` with inaccessible course returns 401. `destroy` on own clip returns 200. `destroy` on another user's clip returns 404.

**Story 4 — API Routes**
- Title: `Register text_clips routes under /api/v1/courses/:course_id/`
- Body: Add routes to `config/routes.rb` registering GET, POST, and DELETE endpoints for text clips nested under `/api/v1/courses/:course_id/text_clips`. Follow existing Canvas API route conventions.
- Codebase evidence: Change lands in `config/routes.rb` — follows Canvas `/api/v1/` namespace convention identified in codebase analysis.
- Acceptance criteria: `GET /api/v1/courses/:course_id/text_clips` routes to `text_clips#index`. `POST /api/v1/courses/:course_id/text_clips` routes to `text_clips#create`. `DELETE /api/v1/courses/:course_id/text_clips/:id` routes to `text_clips#destroy`.

---

#### Milestone: React Tray

**Story 5 — TextClipTray Component**
- Title: `Create TextClipTray React component`
- Body: Create `ui/features/text_clips/TextClipTray.tsx` using Instructure UI's Tray component following the CommentsTray pattern identified in Lab 2 analysis (`ui/shared/assignments/react/CommentsTray/index.jsx`). Use `placement="end"`, `size="regular"`. Include a close button, scrollable clip list, and empty state. All code must be TypeScript per Canvas workspace rules in `ui/AGENTS.md`.
- Codebase evidence: Follows pattern of `ui/shared/assignments/react/CommentsTray/index.jsx` identified during Lab 2 agent-assisted exploration.
- Acceptance criteria: Tray renders list of clips passed as props. Tray shows empty state when no clips exist. Close button dismisses tray. Component is TypeScript with no class components or default utility function exports.

**Story 6 — TextClipItem Component**
- Title: `Create TextClipItem React component`
- Body: Create `ui/features/text_clips/TextClipItem.tsx` — a single row in the clip list showing clip content, source URL, and a delete button. Must be TypeScript.
- Acceptance criteria: Renders clip content and source URL. Delete button calls the provided delete handler. Component is TypeScript.

**Story 7 — API Helper**
- Title: `Create text clips API helper module`
- Body: Create `ui/features/text_clips/api.ts` with typed functions for `fetchClips(courseId)`, `createClip(courseId, content, sourceUrl)`, and `deleteClip(clipId)`. Use Canvas's existing fetch patterns with proper error handling.
- Acceptance criteria: `fetchClips` returns an array of clips for the given course. `createClip` posts to the correct endpoint and returns the created clip. `deleteClip` sends a DELETE request and handles 404 gracefully.

---

#### Milestone: Text Selection

**Story 8 — Text Selection Listener**
- Title: `Create global text selection listener bundle`
- Body: Create a small separately bundled script (not part of the tray feature bundle) that listens for `mouseup` events across all Canvas pages, detects non-empty text selections, and shows a Clip button near the selection. The button must not appear when the selection is inside a Canvas rich text editor. On click, calls `createClip` and shows a confirmation. Must be TypeScript.
- Acceptance criteria: Given text highlighted on a Canvas course page, clip button appears. Given text highlighted inside a rich text editor, clip button does not appear. Given clip button clicked, clip is saved and confirmation shown. Given API failure, error message is shown and no false confirmation is given.

---

#### Milestone: Navigation Integration

**Story 9 — SideNav Toggle Button**
- Title: `Add Text Clipper toggle button to SideNav`
- Body: Modify `ui/shared/top-navigation/react/SideNav.tsx` (the global left sidebar present on all Canvas pages) to add a toggle button that opens and closes the TextClipTray. Tray open/close state should be persisted in `sessionStorage` keyed by `course_id` so the tray reopens correctly after Canvas page reloads.
- Codebase evidence: `SideNav.tsx` identified as the correct global navigation integration point — `TopNav.tsx` is per-feature and does not satisfy FR-04.
- Acceptance criteria: Toggle button is visible on all Canvas pages. Clicking the button opens the tray. Clicking again closes it. After a page reload within the same course, tray state is restored from sessionStorage. Tray is not shown on pages outside a course context.

---

#### Milestone: Testing and Verification

**Story 10 — Rails Model and Controller Tests**
- Title: `Write RSpec tests for TextClip model and controller`
- Body: Write RSpec unit tests covering all acceptance criteria from `implementation-research.md` Section 5. Model specs: valid save, user_id validation, nullable course_id, soft delete, for_user and for_course scopes. Controller specs: index scoping, create with valid/invalid course access, destroy own vs other user's clip.
- Acceptance criteria: All model specs pass. All controller specs pass. No existing Canvas specs are broken.

**Story 11 — React Component Tests**
- Title: `Write Jest tests for TextClipTray and TextClipItem`
- Body: Write Jest/React Testing Library tests for `TextClipTray` and `TextClipItem`. Cover: tray renders clip list, tray shows empty state, delete button calls handler, clip button does not appear inside rich text editor.
- Acceptance criteria: All component tests pass. No existing Canvas frontend tests are broken.

**Story 12 — Manual Verification Checklist**
- Title: `Complete manual verification checklist`
- Body: Manually verify the following scenarios that are impractical to unit test: (1) tray persistence across Canvas page navigation within a course, (2) clips from Course A do not appear in Course B's tray, (3) clips created as a student are not visible when logged in as a different user, (4) clip button does not appear in discussion editor, assignment submission editor, or wiki page editor, (5) PlannerNote feature and assignment submission flow are unaffected.
- Acceptance criteria: All 5 manual checks pass and are documented with notes.

---

## Guardrails

- Never create issues or projects against any repository other than `THAT-ON3-GUY/canvas-lms`
- Never invent scope not present in `implementation-research.md` — if something is listed as out of scope there, do not create a story for it
- Never store or log the GitHub PAT
- If a MCP tool call fails, stop and report the error — do not retry silently or skip the step
- If the project already exists, do not create a duplicate — confirm with the user before proceeding

---

## Verification (Human Checklist)

After the agent run completes, verify the following manually:

- [ ] GitHub Project titled "Canvas Text Clipper" exists on `THAT-ON3-GUY/canvas-lms`
- [ ] All 12 issues exist on the repository
- [ ] Each issue is assigned to the correct milestone
- [ ] Each issue body references a file path from `implementation-research.md` Section 4
- [ ] FR-01 through FR-07 are each covered by at least one issue's acceptance criteria
- [ ] Stories 10, 11, and 12 cover the testing plan from `implementation-research.md` Section 5
- [ ] No issues exist for out-of-scope items (global clips, clip editing, clip search, sharing)
- [ ] All 12 issues are added to the GitHub Project board

### Traceability Map

| Functional Requirement | Covered By |
|---|---|
| FR-01 (save clip on highlight) | Story 8 |
| FR-02 (tray shows user+course clips) | Story 5, Story 7 |
| FR-03 (delete clip without reload) | Story 6, Story 7 |
| FR-04 (button on all Canvas pages) | Story 9 |
| FR-05 (tray persists across navigation) | Story 9 |
| FR-06 (clips private to user) | Story 3, Story 10 |
| FR-07 (no clip button in editor) | Story 8, Story 11 |
