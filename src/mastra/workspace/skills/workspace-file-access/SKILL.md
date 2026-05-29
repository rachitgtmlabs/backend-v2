---
name: workspace-file-access
description: >
  ACTIVATE before searching for which skill to read. Covers tool priority
  (search → read_file → grep) for skill discovery and the format for task
  graph emissions.
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# Skill Discovery & File Access

You have a workspace of `task-plan-*` skill files (markdown). Each file describes one domain (leases, amendments, CAM rules, etc.) and lists the **Task Graph Patterns** the orchestrator copies/adapts when planning.

## Tool Priority

Pick the lightest tool that answers the question.

### 1. `search(query)` — FIRST CHOICE for "which skill applies"

BM25 keyword search across all skill files.

- `search({ query: "cam reconciliation 2024 audit" })` → returns ranked skill paths
- `search({ query: "amendment field history rent change" })`

### 2. `read_file(path)` — for reading the chosen skill

Once a skill is identified, read it in full. Skills are short (~80 lines).

- `read_file({ path: "skills/task-plan-cam-reconciliation/SKILL.md" })`

### 3. `grep(pattern, path?)` — for cross-skill keyword hunts

Use when no single skill clearly owns the question.

- `grep({ pattern: "expiring", path: "skills/" })`

## When to Skip Skill Discovery

You may plan directly (no `search` / `read_file`) when:
- The user's question is greeting / small talk / unrelated to lease data.
- The UI context already pins exactly the IDs needed for a single obvious tool (e.g. property_id is set and the user says "show me this property" → `fetch-property-details`).

In every other case — and ALWAYS for CAM, amendments, or any portfolio-wide question — `search` for the relevant skill first.

## Workspace Layout

```
skills/
├── workspace-file-access/SKILL.md   ← this file
├── task-plan-portfolio-property/SKILL.md
├── task-plan-leases/SKILL.md
├── task-plan-amendments/SKILL.md
├── task-plan-tasks-alerts/SKILL.md
├── task-plan-cam-rules/SKILL.md
├── task-plan-cam-reconciliation/SKILL.md
└── task-plan-cam-clauses/SKILL.md
```

Skill files are SOURCE OF TRUTH for which tools to call. Do not invent tool names not listed in the skill you read.
