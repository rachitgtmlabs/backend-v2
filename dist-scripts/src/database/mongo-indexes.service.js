"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MongoIndexesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoIndexesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let MongoIndexesService = MongoIndexesService_1 = class MongoIndexesService {
    constructor(connection) {
        this.connection = connection;
        this.logger = new common_1.Logger(MongoIndexesService_1.name);
    }
    async onModuleInit() {
        const models = Object.values(this.connection.models);
        if (models.length === 0) {
            this.logger.warn('No Mongoose models registered; skipping index ensure');
            return;
        }
        await Promise.all(models.map((model) => model.syncIndexes()));
        const collections = models
            .map((m) => `${m.modelName}(${m.collection.collectionName})`)
            .sort()
            .join(', ');
        this.logger.log(`MongoDB indexes ensured: ${collections}`);
    }
};
exports.MongoIndexesService = MongoIndexesService;
exports.MongoIndexesService = MongoIndexesService = MongoIndexesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], MongoIndexesService);
//# sourceMappingURL=mongo-indexes.service.js.map