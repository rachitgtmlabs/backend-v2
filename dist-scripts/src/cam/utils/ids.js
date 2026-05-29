"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newReminderId = exports.newSessionId = exports.newReconRunId = exports.newThresholdId = exports.newInvoiceId = exports.newBillId = exports.newCategoryId = void 0;
const crypto_1 = require("crypto");
function id(prefix) {
    return `${prefix}_${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
const newCategoryId = () => id('exc');
exports.newCategoryId = newCategoryId;
const newBillId = () => id('bil');
exports.newBillId = newBillId;
const newInvoiceId = () => id('inv');
exports.newInvoiceId = newInvoiceId;
const newThresholdId = () => id('uth');
exports.newThresholdId = newThresholdId;
const newReconRunId = () => id('rec');
exports.newReconRunId = newReconRunId;
const newSessionId = () => id('ses');
exports.newSessionId = newSessionId;
const newReminderId = () => id('rem');
exports.newReminderId = newReminderId;
//# sourceMappingURL=ids.js.map