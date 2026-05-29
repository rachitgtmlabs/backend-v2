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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const personal_domains_1 = require("./personal-domains");
const organization_schema_1 = require("./schemas/organization.schema");
function newOrgId() {
    return `org_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
}
let OrganizationsService = class OrganizationsService {
    constructor(orgModel) {
        this.orgModel = orgModel;
    }
    async resolveForEmail(emailRaw) {
        const email = emailRaw.trim().toLowerCase();
        const at = email.indexOf('@');
        if (at <= 0 || at === email.length - 1) {
            throw new common_1.BadRequestException(`Invalid email: ${emailRaw}`);
        }
        const domain = email.slice(at + 1);
        const personal = (0, personal_domains_1.isPersonalDomain)(domain);
        const key = personal ? email : domain;
        const kind = personal ? 'personal' : 'domain';
        const name = personal ? `Personal: ${email}` : domain;
        const doc = await this.orgModel
            .findOneAndUpdate({ domain: key }, {
            $setOnInsert: {
                orgId: newOrgId(),
                domain: key,
                name,
                kind,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .exec();
        return doc;
    }
    findByOrgId(orgId) {
        return this.orgModel.findOne({ orgId }).exec();
    }
    listAll() {
        return this.orgModel.find().exec();
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(organization_schema_1.Organization.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map