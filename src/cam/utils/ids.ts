import { randomBytes } from 'crypto';

/**
 * Public ID generators for CAM resources. Match the existing repo
 * convention (unt_, prp_, por_, les_, etc.) — 6 random bytes = 12 hex
 * chars after a short prefix. Collisions are astronomically unlikely at
 * our scale and the sparse-unique indexes catch the impossible.
 */
function id(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

export const newCategoryId = (): string => id('exc');
export const newBillId = (): string => id('bil');
export const newInvoiceId = (): string => id('inv');
export const newThresholdId = (): string => id('uth');
export const newReconRunId = (): string => id('rec');
export const newSessionId = (): string => id('ses');
export const newReminderId = (): string => id('rem');
export const newCamRuleId = (): string => id('rul');
