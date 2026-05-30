"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentOrgId = exports.CurrentUserId = exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user)
        return undefined;
    return data ? user[data] : user;
});
exports.CurrentUserId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user?._id ? String(user._id) : undefined;
});
exports.CurrentOrgId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user?.organization_id;
});
//# sourceMappingURL=current-user.decorator.js.map