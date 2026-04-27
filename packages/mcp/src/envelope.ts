import { DcklError } from "@dckl/core";

export type ToolResult<T> =
  | { ok: true; data: T; warnings?: string[] }
  | { ok: false; code: string; message: string; hint?: string };

export function ok<T>(data: T, warnings?: string[]): ToolResult<T> {
  if (warnings && warnings.length > 0) {
    return { ok: true, data, warnings };
  }
  return { ok: true, data };
}

export function fail(code: string, message: string, hint?: string): ToolResult<never> {
  return hint ? { ok: false, code, message, hint } : { ok: false, code, message };
}

export function fromError(err: unknown): ToolResult<never> {
  if (err instanceof DcklError) {
    return fail(err.code, err.message, err.hint);
  }
  if (err instanceof Error) {
    return fail("UNEXPECTED", err.message);
  }
  return fail("UNEXPECTED", String(err));
}

export interface McpToolContent {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function asMcpContent<T>(result: ToolResult<T>): McpToolContent {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
}
