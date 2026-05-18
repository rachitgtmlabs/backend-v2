/**
 * Deep merge utility for applying amendment deltas to lease state.
 * 
 * Recursively merges source into target:
 * - Objects are merged recursively
 * - Arrays replace entirely (amendment arrays override, not concatenate)
 * - Primitives replace
 * - "Empty" delta values are ignored (represent "no change"):
 *   - undefined, null
 *   - empty strings ("") when target has content
 *   - empty arrays ([]) when target has items
 *   - zero (0) when target has non-zero value
 */

function isEmptyDeltaValue(value: unknown, targetValue: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (value === '' && typeof targetValue === 'string' && targetValue !== '') return true;
  if (Array.isArray(value) && value.length === 0 && Array.isArray(targetValue) && targetValue.length > 0) return true;
  if (value === 0 && typeof targetValue === 'number' && targetValue !== 0) return true;
  return false;
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // Skip empty delta values that represent "no change"
    if (isEmptyDeltaValue(sourceValue, targetValue)) {
      continue;
    }

    // If both values are plain objects, merge recursively
    if (
      isPlainObject(sourceValue) &&
      isPlainObject(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      // Arrays and primitives replace entirely
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
