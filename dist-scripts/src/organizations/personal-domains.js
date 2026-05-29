"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSONAL_EMAIL_DOMAINS = void 0;
exports.isPersonalDomain = isPersonalDomain;
exports.PERSONAL_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'yahoo.com',
    'ymail.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'proton.me',
    'protonmail.com',
    'aol.com',
]);
function isPersonalDomain(domain) {
    return exports.PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase());
}
//# sourceMappingURL=personal-domains.js.map