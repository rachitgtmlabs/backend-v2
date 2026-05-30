"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const request_context_1 = require("@mastra/core/request-context");
const mastra_1 = require("../mastra");
const rbac_1 = require("../mastra/lib/rbac");
let ChatService = ChatService_1 = class ChatService {
    constructor() {
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async chat(dto, orgId) {
        const { messages, context } = dto;
        const recent = messages.slice(-ChatService_1.CHAT_MESSAGE_WINDOW);
        const lastUser = [...recent].reverse().find((m) => m.role === 'user');
        const userRequest = lastUser?.content?.trim() ?? '';
        if (!userRequest) {
            return this.fallback('Please send a message to ask something.');
        }
        if (!orgId) {
            return this.fallback('I could not verify your account. Please sign in again.');
        }
        try {
            const workflow = mastra_1.mastra.getWorkflow('lease-chat-workflow');
            if (!workflow) {
                this.logger.error('lease-chat-workflow not registered');
                return this.fallback('Sorry, the assistant is unavailable.');
            }
            const requestContext = new request_context_1.RequestContext();
            requestContext.set(rbac_1.RBAC_ORG_ID_KEY, orgId);
            const run = await workflow.createRun();
            const result = await run.start({
                inputData: {
                    userRequest,
                    uiContext: context ?? {},
                    recentMessages: recent.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                },
                requestContext,
            });
            if (result.status !== 'success') {
                this.logger.warn(`Workflow finished with status=${result.status}`);
                return this.fallback('I could not complete that request. Please try again.');
            }
            const out = result.result;
            return {
                answer: out.answer,
                citations: out.citations ?? [],
                highlightWidgets: out.highlightWidgets ?? [],
                suggestedFollowUps: out.suggestedFollowUps ?? [],
                iterationsUsed: out.iterationsUsed ?? 0,
                toolsUsed: out.toolsUsed ?? [],
                response: out.answer,
            };
        }
        catch (error) {
            this.logger.error('Chat workflow failed', error);
            return this.fallback('Sorry, I encountered an error while processing your request. Please try again.');
        }
    }
    fallback(message) {
        return {
            answer: message,
            citations: [],
            highlightWidgets: [],
            suggestedFollowUps: [],
            iterationsUsed: 0,
            toolsUsed: [],
            response: message,
        };
    }
    async streamChat(dto, orgId, res) {
        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        res.socket?.setNoDelay(true);
        const write = (event) => {
            try {
                res.write(JSON.stringify(event) + '\n');
                res.flush?.();
            }
            catch {
            }
        };
        const { messages, context } = dto;
        const recent = messages.slice(-ChatService_1.CHAT_MESSAGE_WINDOW);
        const lastUser = [...recent].reverse().find((m) => m.role === 'user');
        const userRequest = lastUser?.content?.trim() ?? '';
        if (!userRequest) {
            this.writeFinal(write, 'Please send a message to ask something.');
            res.end();
            return;
        }
        if (!orgId) {
            this.writeFinal(write, 'I could not verify your account. Please sign in again.');
            res.end();
            return;
        }
        const workflow = mastra_1.mastra.getWorkflow('lease-chat-workflow');
        if (!workflow) {
            this.logger.error('lease-chat-workflow not registered');
            this.writeFinal(write, 'Sorry, the assistant is unavailable.');
            res.end();
            return;
        }
        const requestContext = new request_context_1.RequestContext();
        requestContext.set(rbac_1.RBAC_ORG_ID_KEY, orgId);
        let finalEmitted = false;
        try {
            const run = await workflow.createRun();
            const stream = run.stream({
                inputData: {
                    userRequest,
                    uiContext: context ?? {},
                    recentMessages: recent.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                },
                requestContext,
            });
            for await (const chunk of stream.fullStream) {
                const event = extractChatStreamEvent(chunk);
                if (!event)
                    continue;
                write(event);
                if (event.type === 'final')
                    finalEmitted = true;
            }
            if (!finalEmitted) {
                const final = await stream.result;
                if (final.status === 'success') {
                    const out = final.result;
                    write({
                        type: 'final',
                        answer: out?.answer ??
                            'I could not put together a response. Please try again.',
                        citations: out?.citations ?? [],
                        highlightWidgets: out?.highlightWidgets ?? [],
                        suggestedFollowUps: out?.suggestedFollowUps ?? [],
                        iterationsUsed: out?.iterationsUsed ?? 0,
                        toolsUsed: out?.toolsUsed ?? [],
                    });
                }
                else {
                    this.logger.warn(`Workflow finished with status=${final.status} — emitting fallback`);
                    this.writeFinal(write, 'I could not complete that request. Please try again.');
                }
            }
        }
        catch (error) {
            this.logger.error('Chat stream failed', error);
            write({
                type: 'error',
                message: error instanceof Error
                    ? error.message
                    : 'Unexpected streaming error.',
            });
            if (!finalEmitted) {
                this.writeFinal(write, 'Sorry, I encountered an error while processing your request. Please try again.');
            }
        }
        finally {
            res.end();
        }
    }
    writeFinal(write, message) {
        write({
            type: 'final',
            answer: message,
            citations: [],
            highlightWidgets: [],
            suggestedFollowUps: [],
            iterationsUsed: 0,
            toolsUsed: [],
        });
    }
};
exports.ChatService = ChatService;
ChatService.CHAT_MESSAGE_WINDOW = 6;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)()
], ChatService);
function extractChatStreamEvent(chunk) {
    if (!chunk || typeof chunk !== 'object')
        return null;
    const c = chunk;
    if (isChatEventType(c.type))
        return c;
    const payload = c.payload;
    if (payload && isChatEventType(payload.type)) {
        return payload;
    }
    return null;
}
function isChatEventType(value) {
    return (value === 'status' ||
        value === 'tool_started' ||
        value === 'tool_completed' ||
        value === 'final' ||
        value === 'error');
}
//# sourceMappingURL=chat.service.js.map