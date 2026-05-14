# Memory Technique: Last-Verified Timestamps + Re-Grounding Triggers

## Technique Choice and Why It Fits

The technique applied is **last-verified timestamps combined with explicit re-grounding
triggers** — a lightweight long-term memory pattern from Week 3. Rather than relying on
a vector database or external memory library, this approach embeds freshness metadata
directly into the agent artifact files already maintained in this project
(`agents/analyze-repo.md`, `agents/tasks/feature-1/implementation-research.md`, etc.).

This fits the Canvas Text Clipper project specifically because:
- The Canvas LMS codebase is large and actively maintained — file paths, patterns, and
  conventions can change after upstream pulls
- Multiple agent files reference specific file paths found during Lab 2 codebase analysis
  (e.g. `app/models/planner_note.rb`, `ui/shared/assignments/react/CommentsTray/index.jsx`)
- Without freshness tracking, an AI session might confidently act on stale findings

---

## Connection to Lab 2 Agent and Other Artifacts

This memory technique is directly applied to the following agent artifacts:

- `agents/analyze-repo.md` — the repo analysis agent that produced codebase findings.
  Before running this agent, check the `last_verified` date. If it is more than 2 weeks
  old or if an upstream pull has occurred since, re-run `generate-index_Version2.py`
  and regenerate `agents/focused-index.json` before proceeding.
- `agents/tasks/feature-1/implementation-research.md` — contains specific file paths
  and codebase findings from Lab 2. The `last_verified` date on this file indicates
  when those paths were last confirmed against the actual repo.
- `agents/project-creation.md` — references the research file as source of truth.
  If the research file is stale, the project plan may reference incorrect paths.

---

## Procedure (Prompts / File Rituals)

### At the top of each agent artifact, add a metadata block:

```markdown
---
last_verified: 2026-05-14
verified_by: manual inspection + agent run
canvas_commit: (run `git rev-parse --short HEAD` to capture)
re_ground_if: upstream pull, merge, or >2 weeks since last_verified
---
```

### Before starting any AI session that references codebase findings:

1. Check the `last_verified` date in the relevant artifact
2. Run `git log --oneline -5` to see if commits have occurred since that date
3. If stale, tell the AI explicitly:
   *"The codebase findings in implementation-research.md were last verified on
   [date]. Please treat specific file paths as hypotheses to confirm rather than
   facts."*
4. If fresh, tell the AI:
   *"The codebase findings were verified on [date] against commit [hash]. You may
   trust the file paths and patterns cited."*

### After any upstream pull or significant merge:

1. Re-run the index agent: `python3 agents/scripts/generate-index_Version2.py --repo-path . --output agents/focused-index.json --filter-paths app/models,app/controllers/api`
2. Spot-check 2-3 key file paths from `implementation-research.md` to confirm they
   still exist
3. Update the `last_verified` date in the artifact
4. Update the `canvas_commit` hash

---

## Purge / Refresh / Last Verified

- **Refresh trigger:** Any upstream pull, branch merge, or passage of more than 2 weeks
- **Purge policy:** Codebase findings older than 4 weeks should be fully re-verified
  before implementation begins — do not act on them without re-grounding
- **Last verified:** 2026-05-14
- **Verified against commit:** (run `git rev-parse --short HEAD` in canvas-lms to capture)

---

## Failure Modes and Mitigations

### Failure mode 1: Stale file paths
An AI session references `app/models/planner_note.rb` as the pattern to follow, but a
Canvas upstream update moved or renamed it.

**Mitigation:** Always run `git log --oneline -5` before a session and compare against
`last_verified`. If commits have occurred, spot-check key paths with `ls` before
proceeding.

### Failure mode 2: Over-trust of research findings
The AI treats `implementation-research.md` as ground truth even after a significant
upstream pull, generating code that references nonexistent files.

**Mitigation:** The re-grounding trigger prompt explicitly downgrades stale findings
from "facts" to "hypotheses." This changes the AI's behavior from confident generation
to cautious verification.

### Failure mode 3: Timestamp not updated
A developer re-verifies paths manually but forgets to update `last_verified`, causing
future sessions to incorrectly treat fresh findings as stale.

**Mitigation:** Add updating `last_verified` to the definition of done for any task
that involves reading or verifying codebase paths.

---

## Evidence Excerpt

The following is a condensed excerpt from the session where this technique was applied
during Lab 3.1 research. The re-grounding trigger was used when starting the
implementation research session after a gap since the Lab 2 index was generated.

**Prompt used:**
> "The codebase findings in implementation-research.md were generated from a focused
> index built on [date]. Before we write any implementation code, please treat all
> file paths as hypotheses and confirm each one exists with `cat` or `ls` before
> referencing it in generated code."

**Result:** The AI confirmed `app/models/planner_note.rb` and
`app/controllers/planner_notes_controller.rb` existed before using them as patterns,
and flagged that `ui/shared/assignments/react/CommentsTray/index.jsx` should be
verified since JSX files may have been migrated to TSX in a recent upstream update.

This directly prevented a potential error where generated code would have referenced
a stale file path.

*(No secrets, tokens, or hostnames redacted from this excerpt — none were present.)*
