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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseSchema = exports.Lease = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const drafted_amendment_schema_1 = require("./drafted-amendment.schema");
let Lease = class Lease {
};
exports.Lease = Lease;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: { unique: true, sparse: true } }),
    __metadata("design:type", String)
], Lease.prototype, "leaseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Lease.prototype, "portfolio_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, index: true, default: null }),
    __metadata("design:type", Object)
], Lease.prototype, "property_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, index: true, default: null }),
    __metadata("design:type", Object)
], Lease.prototype, "unit_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['draft', 'processed'] }),
    __metadata("design:type", String)
], Lease.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Lease.prototype, "file_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, required: true }),
    __metadata("design:type", Object)
], Lease.prototype, "lease_information", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, required: true }),
    __metadata("design:type", Object)
], Lease.prototype, "analysis", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0, index: true }),
    __metadata("design:type", Number)
], Lease.prototype, "amendment_version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Lease.prototype, "gcs_document_path", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [drafted_amendment_schema_1.DraftedAmendmentSchema], default: [] }),
    __metadata("design:type", Array)
], Lease.prototype, "drafted_amendments", void 0);
exports.Lease = Lease = __decorate([
    (0, mongoose_1.Schema)({ collection: 'leases', timestamps: true })
], Lease);
exports.LeaseSchema = mongoose_1.SchemaFactory.createForClass(Lease);
exports.LeaseSchema.index({ portfolio_id: 1, property_id: 1, updatedAt: -1 });
exports.LeaseSchema.index({
    portfolio_id: 1,
    property_id: 1,
    status: 1,
    updatedAt: -1,
});
exports.LeaseSchema.index({ property_id: 1, updatedAt: -1 });
exports.LeaseSchema.index({ unit_id: 1, updatedAt: -1 });
exports.LeaseSchema.index({ unit_id: 1, status: 1, updatedAt: -1 });
//# sourceMappingURL=lease.schema.js.map