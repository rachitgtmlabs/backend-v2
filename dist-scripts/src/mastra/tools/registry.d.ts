import type { ToolName } from '../workflows/schemas';
type ExecutableTool = {
    id: string;
    description?: string;
    execute: (input: any, ctx?: any) => Promise<unknown>;
};
export declare const TOOL_REGISTRY: Record<ToolName, ExecutableTool>;
export declare const TOOL_DIRECTORY: Array<{
    name: ToolName;
    when: string;
    inputs: string;
    isDynamic: boolean;
}>;
export {};
