---
name: task-plan-amendments
description: >
  ACTIVATE when the user asks how a lease changed over time, when a specific
  field changed (rent, CAM, term), the amendment timeline, or any
  "what's new since v1" question. Distinct from current lease state.
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# Amendment Operations

## Capabilities

- Chronological view: amendments in order with version numbers and effective dates (lease "evolution")
- Field-level change log: track a single field (e.g. `rent`, `cam_cap`) across every amendment

## Required Context

- `fetch-lease-evolution`: `lease_id`
- `fetch-amendment-history`: `lease_id`, optional `fieldFilter` (substring matched against field paths, e.g. `"rent"`, `"cam"`, `"term"`)

## Dependencies

- Both tools require a `lease_id`. If the user names a property and `lease_id` is unknown, plan `search-properties` first — its result includes the latest `lease_id` for the property. See [[task-plan-portfolio-property]].
- Do NOT also call `fetch-lease-document` unless the user wants the CURRENT state too. Amendment tools are for *changes*, not current values.

## Task Graph Patterns

### Full amendment timeline (lease_id known)

```json
[
  { "id":"t1","toolName":"fetch-lease-evolution","inputs":"{\"lease_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading amendment timeline" }
]
```

### "When did rent change?" / field-scoped history

```json
[
  { "id":"t1","toolName":"fetch-amendment-history","inputs":"{\"lease_id\":\"<id>\",\"fieldFilter\":\"rent\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Tracking rent changes" }
]
```

Other useful `fieldFilter` values:
- `"cam"` — any CAM-related field change
- `"term"` — term/expiration changes
- `"option"` — option / renewal / termination clause changes

### Named property + change history (must resolve first)

**Iteration 0:**
```json
[
  { "id":"t1","toolName":"search-properties","inputs":"{\"property_name\":\"<name>\"}","dependsOn":[],"isDynamic":true,"taskTitle":"Looking up <name>" }
]
```

**Iteration 1:** use the LITERAL `lease_id` from Extracted ids.
```json
[
  { "id":"t1","toolName":"fetch-amendment-history","inputs":"{\"lease_id\":\"<from-search>\",\"fieldFilter\":\"rent\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Tracking rent changes" }
]
```

## Output Artifact

For amendment timelines, the orchestrator should select `artifactType: "timeline"`.

## Common Triggers

amendment, amended, changed, history, evolution, since signing, since v1, has rent gone up, when did, how has X changed, modifications, addendum
