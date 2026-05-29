import { type BillInput, type GenerateOptions, type GenerateResult, type UnitInput } from './types';
export declare function generateInvoicesForBatch(bills: readonly BillInput[], units: readonly UnitInput[], options?: GenerateOptions): GenerateResult;
