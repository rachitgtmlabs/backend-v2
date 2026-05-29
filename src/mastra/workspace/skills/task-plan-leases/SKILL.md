---
name: task-plan-leases
description: >
  ACTIVATE when the user asks about lease terms, clauses, rent, dates, options,
  expiring leases, or any specific lease document. Covers the merged
  (lease + amendments) effective state, clause keyword search, and expiration
  windows.
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# Lease Operations

## Capabilities

- Read full lease + amendments **merged into effective state** (rent, dates, clauses, options, CAM terms, exclusions)
- Portfolio-wide clause keyword search ("which leases have a termination option?")
- Find leases expiring within a time window

## Required Context

- `fetch-lease-document`: `portfolio_id`, `property_id`, `lease_id?` (omit to use latest lease for the property)
- `fetch-lease-clauses`: `keyword`, optionally `portfolio_id`, `property_id`
- `fetch-expiring-leases`: `withinDays?` (default 365), optionally `portfolio_id`, `property_id`

## Dependencies

- If the user names a property and `property_id` is unknown, plan a `search-properties` task first (see [[task-plan-portfolio-property]]) — leaf node, then re-plan in the next iteration.
- For clause/expiry questions about a NAMED portfolio with unknown `portfolio_id`, plan `search-portfolios` first.

## Task Graph Patterns

### Fetch one lease's full terms (UI has property_id)

```json
[
  { "id":"t1","toolName":"fetch-lease-document","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading lease document" }
]
```

### "Which leases mention X?" (clause keyword search)

```json
[
  { "id":"t1","toolName":"fetch-lease-clauses","inputs":"{\"keyword\":\"<keyword>\",\"portfolio_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Searching lease clauses" }
]
```

### "What's expiring in the next N days/months?"

```json
[
  { "id":"t1","toolName":"fetch-expiring-leases","inputs":"{\"withinDays\":<days>}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading expiring leases" }
]
```

Combine with `fetch-reminders` (see [[task-plan-tasks-alerts]]) when the user wants both expirations and deadlines together — emit them as parallel siblings.

### Lease terms for a named property (resolve first)

**Iteration 0:**
```json
[
  { "id":"t1","toolName":"search-properties","inputs":"{\"property_name\":\"<name>\"}","dependsOn":[],"isDynamic":true,"taskTitle":"Looking up <name>" }
]
```

**Iteration 1:**
```json
[
  { "id":"t1","toolName":"fetch-lease-document","inputs":"{\"portfolio_id\":\"<from-search>\",\"property_id\":\"<from-search>\",\"lease_id\":\"<from-search>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading lease document" }
]
```

## Rules

- Lease document is **already merged with amendments**. Do NOT call `fetch-lease-document` AND `fetch-lease-evolution` together unless the user asked about change history (then use [[task-plan-amendments]]).
- Clause search is keyword-based, not semantic. If the user uses a fuzzy phrase ("can the tenant get out early"), translate it to a likely keyword ("termination", "kick-out", "early exit") before calling.

## Common Triggers

lease, rent, base rent, escalation, term, expiry, expiration, renewal, option, termination, clause, language, what does the lease say, lease document, when does X expire, expiring leases, leases ending
