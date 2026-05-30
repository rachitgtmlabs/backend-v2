import mongoose from 'mongoose';
export declare function getConnection(): Promise<typeof mongoose>;
export declare function getDb(): Promise<mongoose.mongo.Db>;
export declare function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T;
export declare const SEVERITY_ORDER: readonly ["critical", "high", "medium", "low"];
export declare function severityRank(severity: string): number;
