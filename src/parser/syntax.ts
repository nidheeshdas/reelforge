import type { ParserResult, ProgramNode, SourceLocation } from '@/types/vidscript';
import { parse } from './grammar/parser.js';

interface PeggyError extends Error {
  location?: SourceLocation;
}

export function parseVidscript(code: string): ParserResult {
  try {
    const normalizedCode = code.endsWith('\n') ? code : `${code}\n`;
    const ast = parse(normalizedCode) as ProgramNode;
    return { ast, errors: [] };
  } catch (error: unknown) {
    const err = error as PeggyError;
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
