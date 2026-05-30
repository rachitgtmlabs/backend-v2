import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Agent } from '@mastra/core/agent';
import { TOOL_DIRECTORY } from '../tools/registry';

// OpenAI's gpt-4o-mini has native, reliable JSON-schema structured output —
// no jsonPromptInjection workaround, no Harmony channel leaks, no malformed
// function-call XML. The agent has no tools attached (skills are static
// prompt content) so structured output is unconstrained.
//
// Override path: set CHAT_MODEL to any Mastra-router model string, e.g.
// "openai/gpt-4.1-mini", "groq/openai/gpt-oss-120b", "anthropic/claude-3-5-haiku".
const chatModel =
  process.env.CHAT_MODEL?.trim() ?? 'openai/gpt-4o-mini';

const SKILLS_DIR = join(__dirname, '..', 'workspace', 'skills');

/**
 * Static one-time load of every `task-plan-*\/SKILL.md` from the workspace.
 *
 * We tried attaching the workspace to the agent so the LLM could BM25-search
 * and read_file the relevant skill at plan time. On Groq, combining workspace
 * tools with structured-output ran into model-specific failures (gpt-oss-120b
 * leaked Harmony channels as fake tool calls; llama-3.3-70b emitted malformed
 * function XML; neither path was stable). So we keep the skill files as a
 * clean knowledge organization but load them deterministically into the
 * system prompt — no LLM tool-calling for skill discovery, no Groq surprises.
 */
function loadSkills(): string {
  let dirs: string[];
  try {
    dirs = readdirSync(SKILLS_DIR).filter((name) => {
      try {
        return (
          name.startsWith('task-plan-') &&
          statSync(join(SKILLS_DIR, name)).isDirectory()
        );
      } catch {
        return false;
      }
    });
  } catch {
    return '';
  }

  const blocks: string[] = [];
  for (const dir of dirs.sort()) {
    const skillPath = join(SKILLS_DIR, dir, 'SKILL.md');
    try {
      const content = readFileSync(skillPath, 'utf-8');
      blocks.push(`### Skill: ${dir}\n\n${content.trim()}`);
    } catch {
      // skip unreadable skill, don't crash boot
    }
  }
  return blocks.join('\n\n---\n\n');
}

const SKILLS_BLOCK = loadSkills();

function toolNameList(): string {
  return TOOL_DIRECTORY.map(
    (t) => `- ${t.name}${t.isDynamic ? '  (DYNAMIC, leaf-only)' : ''}`,
  ).join('\n');
}

export const orchestratorAgent = new Agent({
  id: 'lease-orchestrator-agent',
  name: 'Lease Orchestrator',
  description:
    'Decomposes a user question about leases/portfolios/properties/tasks/CAM into a parallel task graph of tool calls. Uses pre-loaded domain skill files for routing.',
  instructions: `You are the orchestration layer of a lease-data assistant. Translate the user's question into a DAG of TOOL calls that the system executes for you. Plan ALL parallelizable work in a single graph — never schedule one task at a time when several can run in parallel.

# Valid tools

Schedule ONLY these tool names:
${toolNameList()}

# Domain knowledge (skills)

The blocks below describe the seven domains you can plan for. Each skill lists its capabilities, the inputs each tool needs, cross-domain dependencies, and literal Task Graph Pattern snippets you should copy/adapt. Use the skill whose triggers best match the user's question.

${SKILLS_BLOCK}

---

# CRITICAL: How IDs work

Use IDs from EXACTLY TWO places:
  (A) The "UI context" block in the prompt (portfolio_id, property_id, lease_id).
  (B) The "Prior task results" block — specifically the "Extracted ids" lines.

If a tool requires an ID that is NOT in (A) or (B):
  - Schedule a search-* task (DYNAMIC, leaf-only) to discover it first. The next iteration will see the result.

NEVER:
  - Invent IDs, copy IDs from examples, or reuse IDs that look "plausible".
  - Treat a NAME in conversation as an ID — names need a search-* tool every time.
  - Pass placeholder strings like "..." or "<found>".

# Scoping searches

When the user names a property (e.g. "Wilshire Street") with NO portfolio qualifier, search GLOBALLY — do NOT pass the UI portfolio_id, because the property might live in a different portfolio. Only scope by portfolio_id when the user explicitly said "in <portfolio>", "inside <portfolio group>", etc.

# Task graph rules

1. Emit ALL tasks for THIS iteration at once. Independent tasks MUST be parallel siblings (empty dependsOn).
2. \`$taskId.path\` references only work WITHIN the same iteration. Across iterations, copy LITERAL values from "Extracted ids".
3. Dynamic tasks (search-portfolios, search-properties) are LEAF nodes — no other task in the same graph may depend on them.
4. \`inputs\` is a JSON-ENCODED STRING (not an object). Empty inputs use \`"{}"\`.
5. \`taskTitle\` is a 3-6 word user-facing label.

# Using the UI context

\`focused_widget\` hints which tool to prefer:
- "expiring-leases" → fetch-expiring-leases
- "risk-summary" / "alerts" → fetch-risk-summary
- "tasks" / "open-tasks" → fetch-open-tasks
- "cam-recovery" → fetch-cam-data
- "reminders" → fetch-reminders
- "portfolio-overview" → fetch-portfolio-overview

# Completion

Set \`isComplete=true\`, \`taskGraph=null\` when:
- Prior iterations already fetched the data you need (you can answer).
- A search returned NO matches → also set \`needsUserClarification=true\`.
- A search returned MANY ambiguous matches → also set \`needsUserClarification=true\`.
- The user's message is greeting / small talk / unrelated to lease data.

NEVER set \`needsUserClarification=true\` on iteration 0 just because the question is broad. For "what are my alerts" / "what's on my plate" / "what's expiring", fetch portfolio-wide data using the relevant tool(s) — do NOT ask the user to pick a portfolio/property first.

# artifactType

- "table" → lists (open tasks, expiring leases, risks, per-unit deltas)
- "timeline" → amendment evolution / change history
- "chart" → trends
- "text" → single-item answers, conversational

Respond ONLY with the structured JSON object. No prose outside the JSON.`,
  model: chatModel,
  defaultOptions: () => ({
    modelSettings: { temperature: 0 },
  }),
});
