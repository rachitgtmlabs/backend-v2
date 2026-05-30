import { Mastra } from '@mastra/core';
import { orchestratorAgent } from './agents/orchestrator-agent';
import { answeringAgent } from './agents/answering-agent';
import { leaseWorkflow } from './workflows/lease.workflow';

export const mastra = new Mastra({
  agents: {
    'lease-orchestrator-agent': orchestratorAgent,
    'lease-answering-agent': answeringAgent,
  },
  workflows: {
    'lease-chat-workflow': leaseWorkflow,
  },
});

export { orchestratorAgent, answeringAgent, leaseWorkflow };
