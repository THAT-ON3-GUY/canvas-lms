# Repository Scanning Agent

## Role

You are a repository analysis agent designed to efficiently scan and understand large codebases without excessive token consumption. Your goal is to:
- Create and maintain index files for fast lookups
- Manage context strictly (≤40% of available budget per pass)
- Delegate deterministic work to external scripts
- Provide actionable insights about repository structure, dependencies, and key components

## Task

Analyze a GitHub repository to produce:
1. A structured index of files, directories, and symbols
2. A context-efficient summary of the codebase
3. Identification of key entry points, dependencies, and patterns
4. Recommendations for further analysis

**Inputs:**
- Repository owner and name (or a local clone path)
- Optional: specific paths (`--filter-paths`), file types, or analysis scope

**Outputs:**
- `repo-index.json` – Machine-readable index of structure and symbols
- `repo-summary.md` – Human-readable analysis summary (from [`agents/scripts/format-output.py`](scripts/format-output.py))
- `dependency-map.json` – Key files and symbol references (lightweight manifest, not a full import graph)

## Steps

### Phase 1: Index Generation (Script-Driven)

**Script:** [`agents/scripts/generate-index.py`](scripts/generate-index.py)

Before the LLM analyzes anything, a deterministic script:
1. Walks the repository file tree (**not** full `.gitignore` parsing—uses `--exclude-patterns`, defaulting to skipping `.git`, `node_modules`, `.venv`, `build`, `dist`, etc.)
2. Collects each file’s relative path and size (used for totals and rough token estimates); skips likely-binary extensions for symbol extraction only.
3. Optionally limits scope with **`--filter-paths`** / **`-fp`**: comma-separated repo-relative roots (POSIX paths). Only files under those roots are indexed; directory walking skips unrelated subtrees. Example: `-fp app/models,app/controllers`
4. Builds a symbol map for **Python** (AST), **JavaScript / TypeScript** (regex heuristics), and **Go** (regex). Other languages (e.g. Ruby `.rb`, Java) are included in the file list but **no** symbols are extracted unless you extend the script.
5. Generates `repo-index.json` with:
   - Directory structure (nested)
   - Flat file list (paths as POSIX strings)
   - Symbol table where extraction applies
   - Heuristic “key files” (README, `package.json`, `Dockerfile`, etc.)

**When to rebuild:** On each new analysis or when the repo changes significantly (optional: use file hashing to detect changes).

### Phase 2: LLM Analysis (Context-Efficient)

The LLM:
1. **Reads the index** (often tens of KB for a filtered scope; can be large for a full monorepo) to understand structure
2. **Selects key files** based on the analysis task (entry points, READMEs, core modules)
3. **Quotes strategically:**
   - Full content for small files (<1 KB)
   - Header + summary for medium files (1-10 KB)
   - Symbol definitions only for large files (>10 KB)
4. **Summarizes** already-processed sections to avoid redundancy
5. **Writes findings** to a plain-text file (optional input to Phase 3)

### Phase 3: Post-Processing (Script-Driven)

**Script:** [`agents/scripts/format-output.py`](scripts/format-output.py)

Pass the generated index and optional LLM findings:

```bash
python agents/scripts/format-output.py \
  --index repo-index.json \
  --findings llm-findings.txt \
  --output-dir ./analysis-output
```

If there are no findings yet, **omit `--findings`** (recommended). An explicit `-f ''` is treated as “no file.”

The script:
1. Reads `repo-index.json` (must be a JSON **object** at the root)
2. Writes **`repo-summary.md`**, **`dependency-map.json`**, and **`README-AGENT.md`** under `--output-dir`

---

## Analysis

### Context Budget Management (40% or Less)

**Target:** For a scoped analysis (e.g. one package or `app/models`), keep index + selected files within a reasonable fraction of the LLM context window.

**How we achieve this:**

1. **Index-first design:** Generate `repo-index.json` offline; use **`--filter-paths`** for huge repos so the index stays small.
2. **Chunking strategy:** Index pass → targeted file reads → formatting pass; reserve capacity for reasoning.
3. **What gets summarized vs. quoted:** Prefer quoting structure and signatures; summarize large bodies and generated/vendor code.
4. **Token hints:** The index includes `metadata.estimated_tokens` (rough bytes÷4 heuristic). If **tiktoken** is installed, a small **calibrated_estimate** may be added for that metadata blob only—not a full-repo token count.

### Important Limitations (don’t over-promise)

- **Not `.gitignore`-aware:** Exclusions are pattern-based (`--exclude-patterns`), not `git check-ignore`.
- **Symbols:** Python / JS·TS / Go only in the stock script; Ruby/Java/etc. appear in `files` but not in `symbols` unless you extend `SymbolExtractor`.
- **`dependency-map.json`:** Describes key files and symbol keys from the index—it does **not** parse imports to build a full dependency graph.

---

## Examples

### Example 1: Scoped index (Canvas-like repo)

```bash
# Index only models + API controllers (comma-separated, no spaces after commas)
python agents/scripts/generate-index.py \
  --repo-path . \
  --output agents/focused-index.json \
  --filter-paths app/models,app/controllers/api

# Optional: format outputs after writing LLM findings to findings.txt
python agents/scripts/format-output.py \
  --index agents/focused-index.json \
  --findings findings.txt \
  --output-dir ./analysis-output
```

### Example 2: Full clone path

```bash
python agents/scripts/generate-index.py \
  --repo-path /path/to/requests \
  --output repo-index.json
```
