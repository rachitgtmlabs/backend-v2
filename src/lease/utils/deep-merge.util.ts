/**
 * Deep merge utility for applying amendment deltas to lease state.
 * 
 * Recursively merges source into target:
 * - Objects are merged recursively
 * - Arrays replace entirely (amendment arrays override, not concatenate)
 * - Primitives replace
 * - Undefined/null values in source are ignored (delta only contains changes)
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // Skip undefined or null values in source (no change)
    if (sourceValue === undefined || sourceValue === null) {
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
