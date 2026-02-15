import type { ParserResult } from '../types/vidscript';
import { parse } from './grammar/parser.js';

export function parseVidscript(code: string): ParserResult {
  try {
    const ast = parse(code);
    return { ast, errors: [] };
  } catch (error: unknown) {
    const err = error as Error & { location?: { start: { line: number; column: number }; end: { line: number; column: number } } };
    return {
      ast: null,
      errors: [
        {
          message: err.message || 'Unknown parsing error',
          location: err.location,
        },
      ],
    };
  }
}

export function validateVidscript(code: string): { valid: boolean; errors: string[] } {
  const result = parseVidscript(code);
  
  if (result.errors.length > 0) {
    return {
      valid: false,
      errors: result.errors.map((e) => e.message),
    };
  }
  
  if (!result.ast) {
    return { valid: false, errors: ['Failed to parse AST'] };
  }
  
  return { valid: true, errors: [] };
}

export function extractPlaceholders(code: string): string[] {
  const placeholderRegex = /\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(code)) !== null) {
    placeholders.push(match[1]);
  }
  
  return Array.from(new Set(placeholders));
}

export function fillPlaceholders(
  code: string,
  values: Record<string, string | number>
): string {
  return code.replace(/\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g, (match, key, defaultValue) => {
    if (key in values) {
      return String(values[key]);
    }
    return defaultValue || match;
  });
}
