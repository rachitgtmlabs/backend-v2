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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email }).select('+password').exec();
    }
    async findByPhone(phone) {
        return this.userModel.findOne({ phone }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id).exec();
    }
    async findBriefingSubscribers(orgId) {
        return this.userModel
            .find({
            organization_id: orgId,
            briefingEmailOptIn: true,
            email: { $exists: true, $ne: null },
        })
            .exec();
    }
    async setBriefingEmailOptIn(userId, enabled) {
        await this.userModel
            .updateOne({ _id: userId }, { $set: { briefingEmailOptIn: enabled } })
            .exec();
        return enabled;
    }
    async create(userData) {
        const newUser = new this.userModel(userData);
        return newUser.save();
    }
    async findOrCreateSocial(userData) {
        let user;
        if (userData.email) {
            user = await this.userModel.findOne({ email: userData.email });
        }
        else if (userData.phone) {
            user = await this.userModel.findOne({ phone: userData.phone });
        }
        if (user) {
            let dirty = false;
            if (userData.photoURL && user.photoURL !== userData.photoURL) {
                user.photoURL = userData.photoURL;
                dirty = true;
            }
            if (userData.organization_id && user.organization_id !== userData.organization_id) {
                user.organization_id = userData.organization_id;
                dirty = true;
            }
            return dirty ? user.save() : user;
        }
        return this.create(userData);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map