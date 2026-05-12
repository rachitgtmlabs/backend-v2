import { Mastra } from '@mastra/core';
import { leaseAgent } from './agents/lease-agent';

export const mastra = new Mastra({
  agents: { leaseAgent },
});

export { leaseAgent };
