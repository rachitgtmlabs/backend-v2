"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEVERITY_ORDER = void 0;
exports.getConnection = getConnection;
exports.getDb = getDb;
exports.deepMerge = deepMerge;
exports.severityRank = severityRank;
const mongoose_1 = __importDefault(require("mongoose"));
let cachedConnection = null;
function resolveConnectionString() {
    return (process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lease_iq');
}
async function getConnection() {
    if (cachedConnection?.connection?.readyState === 1) {
        return cachedConnection;
    }
    cachedConnection = await mongoose_1.default.connect(resolveConnectionString());
    return cachedConnection;
}
async function getDb() {
    const conn = await getConnection();
    const db = conn.connection.db;
    if (!db)
        throw new Error('Database connection not available');
    return db;
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (sourceValue === undefined || sourceValue === null)
            continue;
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else {
            result[key] = sourceValue;
        }
    }
    return result;
}
function isPlainObject(value) {
    return (value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
exports.SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
function severityRank(severity) {
    const i = exports.SEVERITY_ORDER.indexOf(severity);
    return i === -1 ? exports.SEVERITY_ORDER.length : i;
}
//# sourceMappingURL=mongo.js.map