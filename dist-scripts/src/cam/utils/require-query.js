"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireQuery = requireQuery;
const common_1 = require("@nestjs/common");
function requireQuery(value, name) {
    const v = (value ?? '').trim();
    if (!v)
        throw new common_1.BadRequestException(`${name} is required`);
    return v;
}
//# sourceMappingURL=require-query.js.map