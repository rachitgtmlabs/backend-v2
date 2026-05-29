"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonFromLlm = parseJsonFromLlm;
function parseJsonFromLlm(text) {
    let s = text.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
    if (fenced) {
        s = fenced[1].trim();
    }
    return JSON.parse(s);
}
//# sourceMappingURL=json-parse.util.js.map