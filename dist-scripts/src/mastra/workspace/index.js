"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSPACE_SKILLS_DIR = exports.leaseWorkspace = void 0;
const path_1 = require("path");
const workspace_1 = require("@mastra/core/workspace");
const WORKSPACE_ROOT = __dirname;
exports.leaseWorkspace = new workspace_1.Workspace({
    id: 'lease-orchestrator-workspace',
    name: 'Lease Orchestrator Workspace',
    bm25: true,
    filesystem: new workspace_1.LocalFilesystem({
        basePath: WORKSPACE_ROOT,
    }),
    skills: ['skills'],
    autoIndexPaths: ['skills'],
    tools: {
        [workspace_1.WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {
            enabled: true,
            maxOutputTokens: 6000,
        },
        [workspace_1.WORKSPACE_TOOLS.FILESYSTEM.GREP]: {
            enabled: true,
            maxOutputTokens: 4000,
        },
        [workspace_1.WORKSPACE_TOOLS.SEARCH.SEARCH]: {
            enabled: true,
            maxOutputTokens: 4000,
        },
    },
});
exports.WORKSPACE_SKILLS_DIR = (0, path_1.join)(WORKSPACE_ROOT, 'skills');
//# sourceMappingURL=index.js.map