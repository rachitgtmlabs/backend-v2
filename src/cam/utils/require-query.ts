import { BadRequestException } from '@nestjs/common';

/**
 * Helper for controllers: throw a clear 400 if a query param is missing
 * or empty. Mirrors the pattern used in unit.controller.ts.
 */
export function requireQuery(value: string | undefined, name: string): string {
  const v = (value ?? '').trim();
  if (!v) throw new BadRequestException(`${name} is required`);
  return v;
}
