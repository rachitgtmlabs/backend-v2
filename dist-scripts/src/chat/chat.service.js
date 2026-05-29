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
const mastra_1 = require("../mastra");
let ChatService = ChatService_1 = class ChatService {
    constructor() {
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async chat(dto) {
        const { messages, context } = dto;
        const recent = messages.slice(-ChatService_1.CHAT_MESSAGE_WINDOW);
        const lastUser = [...recent].reverse().find((m) => m.role === 'user');
        const userRequest = lastUser?.content?.trim() ?? '';
        if (!userRequest) {
            return this.fallback('Please send a message to ask something.');
        }
        try {
            const workflow = mastra_1.mastra.getWorkflow('lease-chat-workflow');
            if (!workflow) {
                this.logger.error('lease-chat-workflow not registered');
                return this.fallback('Sorry, the assistant is unavailable.');
            }
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
};
exports.ChatService = ChatService;
ChatService.CHAT_MESSAGE_WINDOW = 6;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)()
], ChatService);
//# sourceMappingURL=chat.service.js.map