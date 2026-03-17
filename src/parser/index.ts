import type { CompileOptions, CompileResult, ParserResult } from '@/types/vidscript';
import { compileVidscript } from './compiler';
import { parseVidscript } from './syntax';

export { parseVidscript, compileVidscript };
export type { CompileOptions, CompileResult, ParserResult };

export function validateVidscript(
  code: string,
  options: CompileOptions = {},
): { valid: boolean; errors: string[] } {
  const result = compileVidscript(code, options);

  if (result.errors.length > 0) {
    return {
      valid: false,
      errors: result.errors.map((error) => error.message),
    };
  }

  if (!result.program) {
    return { valid: false, errors: ['Failed to compile AST'] };
  }

  return { valid: true, errors: [] };
}

export function extractPlaceholders(code: string): string[] {
  const placeholderRegex = /\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g;
  const placeholders: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(code)) !== null) {
    placeholders.push(match[1]);
  }

  return Array.from(new Set(placeholders));
}

export function fillPlaceholders(
  code: string,
  values: Record<string, string | number>,
): string {
  return code.replace(/\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g, (match, key, defaultValue) => {
    if (key in values) {
      return String(values[key]);
    }
    return defaultValue || match;
  });
}
