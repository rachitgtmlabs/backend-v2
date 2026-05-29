"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseWorkflow = exports.answeringAgent = exports.orchestratorAgent = exports.mastra = void 0;
const core_1 = require("@mastra/core");
const orchestrator_agent_1 = require("./agents/orchestrator-agent");
Object.defineProperty(exports, "orchestratorAgent", { enumerable: true, get: function () { return orchestrator_agent_1.orchestratorAgent; } });
const answering_agent_1 = require("./agents/answering-agent");
Object.defineProperty(exports, "answeringAgent", { enumerable: true, get: function () { return answering_agent_1.answeringAgent; } });
const lease_workflow_1 = require("./workflows/lease.workflow");
Object.defineProperty(exports, "leaseWorkflow", { enumerable: true, get: function () { return lease_workflow_1.leaseWorkflow; } });
exports.mastra = new core_1.Mastra({
    agents: {
        'lease-orchestrator-agent': orchestrator_agent_1.orchestratorAgent,
        'lease-answering-agent': answering_agent_1.answeringAgent,
    },
    workflows: {
        'lease-chat-workflow': lease_workflow_1.leaseWorkflow,
    },
});
//# sourceMappingURL=index.js.map