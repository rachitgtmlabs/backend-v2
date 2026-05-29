---
name: task-plan-portfolio-property
description: >
  ACTIVATE when the user asks about portfolios, properties, units, the
  "overview", or names an entity by name (e.g. "Apex Tower", "Silverline
  portfolio") that needs to be resolved to an id. Covers list / search /
  overview / details.
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# Portfolio & Property Operations

## Capabilities

- List all portfolios in the org
- Resolve a portfolio name → portfolio_id (fuzzy search)
- Resolve a property name → property_id + parent portfolio_id (fuzzy search)
- Portfolio-level KPIs: total properties, active leases, expiring soon, risk count
- Single-property snapshot: latest lease + counts + recent activity

## Required Context

- `list-portfolios`: none
- `search-portfolios`: `query` (the portfolio name to resolve)
- `search-properties`: `property_name`, optionally `portfolio_id` (only when user explicitly scoped to a portfolio)
- `fetch-portfolio-overview`: `portfolio_id?` (omit to aggregate across all portfolios)
- `fetch-property-details`: `portfolio_id`, `property_id`

## Scoping Rules

- User said **"in Silverline portfolio"**, **"inside the Blue Harbor group"** → pass `portfolio_id` to `search-properties`.
- User just named a property (**"Wilshire Street"**, **"Apex Tower"**) with no portfolio scoping phrase → **search globally**. Do NOT pass UI-context `portfolio_id`. The property may live in a different portfolio than the one the user is currently viewing.

## Dependencies

- `search-portfolios` and `search-properties` are **dynamic** — they may return multiple candidates. They MUST be leaf nodes; no task in the same iteration may depend on them.
- After a search returns a single match, the next iteration plans the actual fetch tasks using the discovered id (LITERAL value from "Extracted ids").

## Task Graph Patterns

### Resolve a property by name → load details

**Iteration 0 (dynamic search alone):**
```json
[
  { "id":"t1","toolName":"search-properties","inputs":"{\"property_name\":\"<name>\"}","dependsOn":[],"isDynamic":true,"taskTitle":"Looking up <name>" }
]
```

**Iteration 1 (after search returns ids):**
```json
[
  { "id":"t1","toolName":"fetch-property-details","inputs":"{\"portfolio_id\":\"<from-search>\",\"property_id\":\"<from-search>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading property details" }
]
```

### Portfolio overview (UI has portfolio_id)

```json
[
  { "id":"t1","toolName":"fetch-portfolio-overview","inputs":"{\"portfolio_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading portfolio overview" }
]
```

### "What portfolios do I have?" / no name given

```json
[
  { "id":"t1","toolName":"list-portfolios","inputs":"{}","dependsOn":[],"isDynamic":false,"taskTitle":"Listing portfolios" }
]
```

### "Tell me about this property" (UI has property_id)

```json
[
  { "id":"t1","toolName":"fetch-property-details","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading property details" }
]
```

## Common Triggers

portfolio, property, properties, asset, building, list portfolios, what do I have, overview, snapshot, "Apex Tower", "Wilshire", "Silverline", show me <name>, tell me about <name>
