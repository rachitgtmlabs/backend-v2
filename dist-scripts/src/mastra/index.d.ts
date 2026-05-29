import { Mastra } from '@mastra/core';
import { orchestratorAgent } from './agents/orchestrator-agent';
import { answeringAgent } from './agents/answering-agent';
import { leaseWorkflow } from './workflows/lease.workflow';
export declare const mastra: Mastra<{
    'lease-orchestrator-agent': import("@mastra/core/agent").Agent<"lease-orchestrator-agent", import("@mastra/core/agent").ToolsInput, undefined, unknown>;
    'lease-answering-agent': import("@mastra/core/agent").Agent<"lease-answering-agent", import("@mastra/core/agent").ToolsInput, undefined, unknown>;
}, {
    'lease-chat-workflow': import("@mastra/core/workflows").Workflow<import("@mastra/core/workflows").DefaultEngineType, import("@mastra/core/workflows").Step<string, unknown, unknown, unknown, unknown, unknown, any, unknown>[], "lease-chat-workflow", unknown, unknown, unknown, unknown, unknown>;
}, Record<string, import("@mastra/core/dist/vector").MastraVector<any>>, Record<string, import("@mastra/core/dist/tts").MastraTTS>, import("@mastra/core/dist/logger").IMastraLogger, Record<string, import("@mastra/core/dist/mcp").MCPServerBase<any>>, Record<string, import("@mastra/core/dist/evals").MastraScorer<any, any, any, any>>, Record<string, import("@mastra/core/tools").ToolAction<any, any, any, any, any, any, unknown>>, Record<string, import("@mastra/core/dist/processors").Processor<any, unknown>>, Record<string, import("@mastra/core/dist/memory").MastraMemory>, Record<string, import("@mastra/core/dist/channels").ChannelProvider>>;
export { orchestratorAgent, answeringAgent, leaseWorkflow };
