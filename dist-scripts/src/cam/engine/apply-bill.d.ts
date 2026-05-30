import type { BillInput, CamAllocationInput, InvoiceResult } from './types';
export declare function applyBillToUnit(bill: BillInput, unitId: string, rule: CamAllocationInput, thresholdBefore: number): InvoiceResult;
