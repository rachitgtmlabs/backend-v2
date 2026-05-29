"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUnitCode = normalizeUnitCode;
const LEADING_LABEL_REGEX = /^(suite|ste|unit|unt|apt|apartment|#)\s*/i;
function normalizeUnitCode(input) {
    if (!input)
        return '';
    return input
        .normalize('NFKC')
        .replace(LEADING_LABEL_REGEX, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}
//# sourceMappingURL=normalize-unit-code.util.js.map