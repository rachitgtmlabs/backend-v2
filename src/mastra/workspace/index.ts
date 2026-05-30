import { join } from 'path';
import {
  LocalFilesystem,
  Workspace,
  WORKSPACE_TOOLS,
} from '@mastra/core/workspace';

/**
 * Workspace rooted at this directory. Contains `skills/` which the
 * orchestrator searches and reads at plan time. No sandbox is configured —
 * the orchestrator only ever READS skill files; it never executes code.
 */
const WORKSPACE_ROOT = __dirname;

export const leaseWorkspace = new Workspace({
  id: 'lease-orchestrator-workspace',
  name: 'Lease Orchestrator Workspace',
  bm25: true,
  filesystem: new LocalFilesystem({
    basePath: WORKSPACE_ROOT,
  }),
  skills: ['skills'],
  autoIndexPaths: ['skills'],
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {
      enabled: true,
      maxOutputTokens: 6000,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.GREP]: {
      enabled: true,
      maxOutputTokens: 4000,
    },
    [WORKSPACE_TOOLS.SEARCH.SEARCH]: {
      enabled: true,
      maxOutputTokens: 4000,
    },
  },
});

export const WORKSPACE_SKILLS_DIR = join(WORKSPACE_ROOT, 'skills');
