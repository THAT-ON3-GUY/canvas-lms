# Implementation Research — Canvas Text Clipper

## Feature Summary

The Text Clipper lets students highlight and save text from any Canvas page into a persistent tray panel. Clips are scoped to the current user and course, with the data model designed to support global (course-agnostic) clips in the future. See `agents/tasks/feature-1/feature-1.md` for the full problem statement and pitch.

---

## 1. Design Considerations

### User Flow

1. Student is reading a Canvas page (module, assignment, wiki page, etc.)
2. Student highlights text on the page
3. A small "Clip" button appears near the selection
4. Student clicks "Clip" — the text is saved and a confirmation is shown
5. A persistent tray panel is accessible via a button in the Canvas navigation bar
6. The tray lists all clips for the current course, newest first
7. Student can delete individual clips from the tray
8. Tray can be opened and closed without losing clips or disrupting the current page

### Data That Crosses Boundaries

Every clip requires a round trip between the React frontend and the Rails backend:

- **Create:** React sends `POST /api/v1/courses/:course_id/text_clips` with `{ content, source_url }`
- **Read:** React sends `GET /api/v1/courses/:course_id/text_clips` to populate the tray on open
- **Delete:** React sends `DELETE /api/v1/courses/:course_id/text_clips/:id`

All requests are authenticated via Canvas's existing session cookie — no additional auth work is needed.

### Permissions and Roles

Clips are private to the user who created them. No other user, including instructors, can read or delete another user's clips. The only permission check needed is that the requesting user has `:read` access to the course — the same check Canvas uses for `PlannerNote`.

### UX Risks

- **Text selection interference:** Attaching a click handler to selected text could conflict with Canvas's existing rich text editors (used in discussions, assignments, etc.). The clip button should only appear outside of editor contexts.
- **Tray vs. page content:** The Instructure UI `<Tray>` component overlays page content on mobile. On desktop it pushes content, which may cause layout shifts on pages with fixed-width layouts.
- **Empty state:** The tray needs a clear empty state for when a student has no clips yet — otherwise it looks broken.

### Interaction with Existing Canvas Concepts

- **Courses:** Clips are scoped to a `course_id`, following the same pattern as `PlannerNote` and `Enrollment`. The `course_id` column is nullable to allow future global clips.
- **Users:** Clips belong to `@current_user`, the standard Canvas authenticated user object available in all controllers.
- **Soft deletion:** Canvas models use `Canvas::SoftDeletable` instead of hard-deleting records. Our `TextClip` model will follow this pattern so deleted clips can be recovered if needed.
- **Navigation:** The tray toggle button will be added to the Canvas top navigation bar, which is a shared React component rendered on every page.

### Project Plan Tracking (for Lab 4 MCP)

The Lab 4 MCP integration should track the following:

| Milestone | Tasks | Definition of Done |
|---|---|---|
| Rails backend | Migration, model, controller, routes | All CRUD endpoints return correct JSON, model specs pass |
| React tray | TextClipTray component, open/close state | Tray renders clips, opens/closes correctly |
| Text selection | Clip button on selection, POST on click | Clicking clip saves text and shows confirmation |
| Navigation integration | Tray toggle in TopNav | Button visible on all Canvas pages |
| Testing | Unit, integration, manual checklist | All acceptance criteria verified |

Dependencies: Rails backend must be complete before React can make real API calls. Navigation integration depends on the tray component existing.

---

## 2. Functional Requirements

**In Scope**
- FR-01: When a student highlights text on a Canvas course page and clicks the "Clip" button, the system shall save the selected text associated with the current user and course.
- FR-02: When a student opens the clip tray, the system shall display all clips belonging to the current user and current course, ordered newest first.
- FR-03: When a student clicks delete on a clip, the system shall remove that clip and update the tray without a full page reload.
- FR-04: The clip tray shall be accessible from a persistent button in the Canvas navigation bar on all Canvas pages.
- FR-05: The clip tray shall remain open as the student navigates between pages within the same course.
- FR-06: The system shall not display one user's clips to any other user.
- FR-07: The clip button shall not appear when text is selected inside a Canvas rich text editor.

**Out of Scope**
- Clips shared between users
- Clips not associated with a course (global clips) — data model supports this but UI will not expose it yet
- Editing clip content after saving
- Organizing clips into groups or tabs
- Clip search or filtering
- Syncing clips to external services

---

## 3. Non-Functional Requirements

### Performance
- The clip tray should load its clip list in under 500ms on a standard Canvas deployment. Since clips are user+course scoped and expected to number in the tens (not thousands), no pagination is required initially.
- The "Clip" button should appear within 100ms of text selection to feel responsive.

### Security and Privacy (FERPA)
- Clips contain text copied from Canvas course content, which may include student-facing grades, feedback, or personally identifiable information. Clips must be readable only by the user who created them — no instructor or admin access to clip content.
- The API must verify that `@current_user` owns the clip before returning or deleting it. Returning a 404 (not 403) for clips belonging to other users is preferred to avoid leaking existence information.
- No clip content should be logged in Canvas's page view or audit logs.

### Accessibility
- The clip tray is built using Instructure UI's `<Tray>` component, which is WCAG 2.1 AA compliant and handles focus management, keyboard navigation, and screen reader announcements automatically.
- The clip button that appears on text selection must have a visible focus state and a screen reader label.
- The tray close button must return focus to the element that triggered the tray open.

### Observability
- Clip creation and deletion should be logged at the Rails `info` level with user ID and course ID (no clip content) for debugging purposes.
- No custom metrics are required for initial release.

### Reliability
- Clip saves should be synchronous — if the API call fails, the UI should show an error and not falsely confirm the save.
- The tray should degrade gracefully if the API is unavailable: show an error message rather than a blank tray.

### Compatibility
- The feature targets Canvas's standard deployment assumptions: Ruby on Rails backend, React frontend, PostgreSQL database.
- The `<Tray>` component requires Instructure UI, which is already a Canvas dependency — no new packages needed.
- The feature should work in Chrome, Firefox, and Safari (Canvas's supported browsers).

---

## 4. Codebase Analysis

### Agent Workflow Used

The repository analysis agent (`agents/scripts/generate-index.py`) was run against the Canvas LMS repository with path filtering to produce a focused index of `app/models` and `app/controllers/api`. The resulting `agents/focused-index.json` (93KB, 985 files) was used to identify relevant patterns. Direct `cat` inspection of key files was then used to confirm findings.

**Index generation command:**
```bash
python3 agents/scripts/generate-index.py \
  --repo-path . \
  --output agents/focused-index.json \
  --filter-paths app/models,app/controllers/api
```

### Hypotheses About Where Change Will Land

| Area | Expected Change |
|---|---|
| `db/migrate/` | New migration creating `text_clips` table |
| `app/models/text_clip.rb` | New model following `PlannerNote` pattern |
| `app/controllers/text_clips_controller.rb` | New controller following `PlannerNotesController` pattern |
| `config/routes.rb` | New route registering the controller under `/api/v1/courses/:course_id/` |
| `ui/features/text_clips/` | New React feature directory with tray component |
| `ui/shared/top-navigation/react/TopNav.tsx` | Add tray toggle button to global nav |

### Concrete Findings from Agent-Assisted Exploration

**Finding 1 — Model pattern: `PlannerNote`**

File: `app/models/planner_note.rb`

`PlannerNote` is the closest existing Canvas model to our `TextClip`. It demonstrates the exact pattern we need:

```ruby
class PlannerNote < ApplicationRecord
  include Canvas::SoftDeletable
  include Plannable
  belongs_to :user
  belongs_to :course
  validates :user_id, presence: true
  scope :for_user, ->(user) { where(user:) }
  scope :for_course, ->(course) { where(course:) }
end
```

Key observations:
- `belongs_to :course` has no `presence: true` — course is already optional, giving us global-scope readiness for free
- `include Canvas::SoftDeletable` — records are soft-deleted, not hard-deleted
- Named scopes `for_user` and `for_course` are the standard Canvas query pattern

Our `TextClip` model will mirror this structure with columns: `user_id`, `course_id` (nullable), `content` (text), `source_url` (string), `workflow_state` (for soft delete).

**Finding 2 — Controller pattern: `PlannerNotesController`**

File: `app/controllers/planner_notes_controller.rb`

This controller demonstrates the full CRUD pattern for user+course scoped data:

```ruby
class PlannerNotesController < ApplicationController
  include Api::V1::PlannerNote
  before_action :check_limited_access_for_students

  def index
    notes = @current_user.planner_notes.active.exclude_deleted_courses
    render json: planner_notes_json(notes, @current_user, session)
  end

  def create
    if (course_id = create_params.delete(:course_id))
      course = Course.find(course_id)
      return unless authorized_action(course, @current_user, :read)
      create_params[:course] = course
    end
    note = @current_user.planner_notes.new(create_params)
    if note.save
      render json: planner_note_json(note, @current_user, session), status: :created
    else
      render json: note.errors, status: :bad_request
    end
  end
end
```

Key observations:
- `@current_user` is provided automatically by Canvas — no auth lookup needed
- `authorized_action(course, @current_user, :read)` is the standard Canvas permission check
- All queries are scoped through `@current_user.planner_notes` — users can never access each other's records
- JSON serialization is handled by a separate serializer module (`Api::V1::PlannerNote`)

Our `TextClipsController` will follow this exact pattern.

**Finding 3 — React component location**

Canvas React features live under `ui/features/`, one folder per feature. Each folder is self-contained and independently bundled. Our feature will be created at:

```
ui/features/text_clips/
  index.jsx          # Entry point
  TextClipTray.jsx   # Main tray component
  TextClipItem.jsx   # Individual clip row
  api.js             # API call helpers
```

**Finding 4 — Persistent UI panel pattern: `CommentsTray`**

File: `ui/shared/assignments/react/CommentsTray/index.jsx`

Canvas uses Instructure UI's `<Tray>` component for persistent side panels:

```jsx
import {Tray} from '@instructure/ui-tray'

export default function CommentsTray({ closeTray, open }) {
  return (
    <Tray label="My Panel" open={open} onDismiss={closeTray} size="regular" placement="end">
      <CloseButton onClick={closeTray} />
      {/* content */}
    </Tray>
  )
}
```

Key observations:
- `open` prop (boolean) controls visibility — driven by React state in the parent
- `onDismiss` handles both the close button and clicking outside the tray
- `placement="end"` slides in from the right
- Accessibility (focus management, keyboard dismiss) is handled by the component automatically

Our `TextClipTray` component will use this identical structure.

### Open Questions

- **OPEN-01:** Does `config/routes.rb` already have a pattern for nesting custom API routes under `/courses/:course_id/`? Need to confirm the exact route registration syntax Canvas uses. *Requires: reviewing `config/routes.rb` directly.*
- **OPEN-02:** How does the Canvas top navigation (`ui/shared/top-navigation/react/TopNav.tsx`) expose extension points for adding new buttons? Is there a plugin pattern or does it require direct modification? *Requires: reading `TopNav.tsx`.*
- **OPEN-03:** Does Canvas require a database migration approval process for new tables in the fork, or can migrations be added freely? *Requires: stakeholder/instructor input.*

---

## 5. Testing and Verification Plan

### Unit-Level Expectations

**Rails model (`TextClip`)**
- A clip with a valid `user_id` and `content` saves successfully
- A clip without `user_id` fails validation
- A clip without `course_id` saves successfully (global scope readiness)
- `soft_delete` marks the clip as deleted without removing the database record
- `for_user` scope returns only clips belonging to the specified user
- `for_course` scope returns only clips belonging to the specified course

**Rails controller (`TextClipsController`)**
- `index` returns only clips belonging to `@current_user` and the specified course
- `create` with a valid `course_id` the user can access saves the clip and returns 201
- `create` with a `course_id` the user cannot access returns 401
- `destroy` on a clip owned by `@current_user` soft-deletes it and returns 200
- `destroy` on a clip owned by a different user returns 404

**React components**
- `TextClipTray` renders the list of clips passed as props
- `TextClipTray` shows an empty state when no clips are passed
- `TextClipItem` calls the delete handler when the delete button is clicked
- Clip button appears when text is selected outside an editor context
- Clip button does not appear when text is selected inside a rich text editor

### Integration Points

- **API ↔ Database:** Verify that `POST /api/v1/courses/:course_id/text_clips` creates a record in the `text_clips` table with the correct `user_id` and `course_id`.
- **API ↔ Frontend:** Verify that the React tray correctly displays clips fetched from the API and updates after a create or delete action without a page reload.

### Manual / Exploratory Checks

- **Role testing:** Verify clips created as a student are not visible when logged in as an instructor or a different student in the same course.
- **Cross-course isolation:** Verify clips from Course A do not appear when viewing Course B's tray.
- **Editor conflict:** Manually test text selection inside a Canvas discussion reply editor, assignment submission editor, and wiki page editor to confirm the clip button does not appear.
- **Tray persistence:** Navigate between pages within the same course and verify the tray state (open/closed, clip list) is preserved.
- **Regression:** Verify that the `PlannerNote` feature, top navigation, and assignment submission flow are unaffected by the changes.

### Acceptance Criteria (mapped to Functional Requirements)

| FR | Acceptance Criterion |
|---|---|
| FR-01 | Given a student highlights text on a course page and clicks "Clip," when the action completes, then a new clip record exists in the database with the correct user_id, course_id, and content. |
| FR-02 | Given a student opens the clip tray, when the tray loads, then only clips belonging to that student and the current course are shown, newest first. |
| FR-03 | Given a student clicks delete on a clip, when the action completes, then the clip is removed from the tray and soft-deleted in the database without a page reload. |
| FR-04 | Given any Canvas page within a course, when the page loads, then the clip tray toggle button is visible in the navigation bar. |
| FR-05 | Given the clip tray is open, when the student navigates to a different page in the same course, then the tray remains open and the clip list is still visible. |
| FR-06 | Given a clip created by User A, when User B makes a GET request to `/api/v1/courses/:course_id/text_clips`, then User A's clip is not present in the response. |
| FR-07 | Given a student selects text inside a Canvas rich text editor, when the selection is made, then the clip button does not appear. |

### Notes on Automated Testing Feasibility

FR-05 (tray persistence across navigation) is difficult to unit test because it depends on Canvas's full page navigation lifecycle. This will be verified manually using the checklist above. If a feature flag is available in the Canvas fork, the feature should be flagged off by default and enabled only for testing to avoid impacting other Canvas functionality during development.
