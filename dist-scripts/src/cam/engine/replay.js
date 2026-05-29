"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayChronologically = replayChronologically;
const generate_1 = require("./generate");
function replayChronologically(bills, units) {
    return (0, generate_1.generateInvoicesForBatch)(bills, units, {
        ordering: 'chronological',
        initial_thresholds: {},
    });
}
//# sourceMappingURL=replay.js.map