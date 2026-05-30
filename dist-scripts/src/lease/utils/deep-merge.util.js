"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepMerge = deepMerge;
function isEmptyDeltaValue(value, targetValue) {
    if (value === undefined || value === null)
        return true;
    if (value === '' && typeof targetValue === 'string' && targetValue !== '')
        return true;
    if (Array.isArray(value) && value.length === 0 && Array.isArray(targetValue) && targetValue.length > 0)
        return true;
    if (value === 0 && typeof targetValue === 'number' && targetValue !== 0)
        return true;
    return false;
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (isEmptyDeltaValue(sourceValue, targetValue)) {
            continue;
        }
        if (isPlainObject(sourceValue) &&
            isPlainObject(targetValue)) {
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
//# sourceMappingURL=deep-merge.util.js.map