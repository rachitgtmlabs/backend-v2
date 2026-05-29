---
name: task-plan-cam-rules
description: >
  ACTIVATE when the user asks about CAM rules, rule definitions, named rules
  ("CAM-014"), base year stop, share %, exclusions, admin fee on rules.
  Distinct from CAM clauses in a lease (see task-plan-cam-clauses) and from
  CAM reconciliations (see task-plan-cam-reconciliation).
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# CAM Rules Operations

CAM rules are **portfolio-scoped reusable templates** the unit form picks from. When a unit attaches a rule, the params are **snapshotted** into `unit.cam_allocation` — editing the rule later does NOT retroactively change attached units.

## Capabilities

- List all CAM rules for a portfolio
- Look up a rule by `rule_code` (exact, case-insensitive — e.g. `"CAM-014"`)
- Substring search by `rule_name` / `description` (e.g. `"base year stop"`)

## Required Context

- `fetch-cam-rules`: `portfolio_id`, optional `rule_code`, optional `query`, optional `limit`

## Dependencies

- If `portfolio_id` is unknown and the user named a portfolio, plan `search-portfolios` first ([[task-plan-portfolio-property]]).
- This tool is NOT dynamic (it returns a deterministic list filtered by code or substring) — safe to compose with other fetch tasks in the same iteration.

## Task Graph Patterns

### List all rules in a portfolio

```json
[
  { "id":"t1","toolName":"fetch-cam-rules","inputs":"{\"portfolio_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading CAM rules" }
]
```

### Lookup by code

```json
[
  { "id":"t1","toolName":"fetch-cam-rules","inputs":"{\"portfolio_id\":\"<id>\",\"rule_code\":\"CAM-014\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading rule CAM-014" }
]
```

### Search by description

```json
[
  { "id":"t1","toolName":"fetch-cam-rules","inputs":"{\"portfolio_id\":\"<id>\",\"query\":\"base year stop\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Searching CAM rules" }
]
```

### "What rule is unit X using?"

This is a different question — it requires reading the **unit's snapshot**, not the rule library. The unit's `cam_allocation` carries the rule_code, base_amount, share_pct, etc. as snapshotted at attach time. The current Mastra toolset does not expose a unit-detail tool yet; route this through `fetch-property-details` ([[task-plan-portfolio-property]]) and tell the answering agent to look inside the units array.

## Rules

- "CAM-014" style strings are `rule_code`, not `ruleId`. Use the `rule_code` input.
- `rule_code` is case-insensitive within a portfolio (collation strength 2).
- `share_pct` is stored as a decimal (0.0482 = 4.82%) — the answering agent should multiply by 100 when displaying.
- A rule's params live on the rule itself; the **unit's snapshot** is the source of truth at compute time. If user asks "what's unit 4B's share?" — that's a unit question, not a rule question.

## Common Triggers

CAM rule, CAM-014, base year stop, share percent, admin fee, exclusions, rule library, rule code, "what's rule X", portfolio rules, named rules
