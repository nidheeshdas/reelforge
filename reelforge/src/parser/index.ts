import type { ParserResult, ProgramNode } from '../types/vidscript';

export function parseVidscript(code: string): ParserResult {
  try {
    const ast = parseCode(code);
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

function parseCode(code: string): ProgramNode {
  const lines = code.split('\n');
  const statements: any[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    
    // Parse input statement
    const inputMatch = line.match(/^input\s+(\w+)\s*=\s*"([^"]+)"$/);
    if (inputMatch) {
      statements.push({
        type: 'Input',
        name: inputMatch[1],
        path: inputMatch[2],
      });
      continue;
    }
    
    // Parse let statement
    const letMatch = line.match(/^let\s+(\w+)\s*=\s*(.+)$/);
    if (letMatch) {
      statements.push({
        type: 'Variable',
        name: letMatch[1],
        value: { type: 'Literal', value: letMatch[2] },
      });
      continue;
    }
    
    // Parse time block
    const timeBlockMatch = line.match(/^\[([^\]]+)\]\s*=\s*(.+)$/);
    if (timeBlockMatch) {
      const timeRange = timeBlockMatch[1];
      const [startStr, endStr] = timeRange.split('-').map(s => s.trim());
      
      const start = parseTime(startStr);
      const end = endStr === 'end' ? Infinity : parseTime(endStr);
      
      statements.push({
        type: 'TimeBlock',
        start: { value: start, raw: startStr },
        end: { value: end, raw: endStr },
        instructions: [{ type: 'Instruction', content: timeBlockMatch[2] }],
      });
      continue;
    }
    
    // Parse output statement
    const outputMatch = line.match(/^output\s+to\s+"([^"]+)"(?:,\s*(.+))?$/);
    if (outputMatch) {
      const options: Record<string, any> = {};
      if (outputMatch[2]) {
        const opts = outputMatch[2].split(',').map(o => o.trim());
        for (const opt of opts) {
          const [key, value] = opt.split(':').map(s => s.trim());
          if (key === 'resolution') options[key] = value;
          else if (key === 'fps') options[key] = parseInt(value);
        }
      }
      statements.push({
        type: 'Output',
        path: outputMatch[1],
        options,
      });
      continue;
    }
    
    // Parse filter
    const filterMatch = line.match(/^filter\s+"(\w+)"(?:,\s*(.+))?$/);
    if (filterMatch) {
      const params: Record<string, number> = {};
      if (filterMatch[2]) {
        const paramParts = filterMatch[2].split(',').map(p => p.trim());
        for (const part of paramParts) {
          const [key, value] = part.split(':').map(s => s.trim());
          params[key] = parseFloat(value);
        }
      }
      statements.push({
        type: 'Filter',
        name: filterMatch[1],
        params,
      });
      continue;
    }
    
    // Parse text
    const textMatch = line.match(/^text\s+"([^"]+)"(?:,\s*(.+))?$/);
    if (textMatch) {
      const params: Record<string, any> = {};
      if (textMatch[2]) {
        const paramParts = textMatch[2].split(',').map(p => p.trim());
        for (const part of paramParts) {
          const [key, value] = part.split(':').map(s => s.trim());
          params[key] = value;
        }
      }
      statements.push({
        type: 'Text',
        content: textMatch[1],
        params,
      });
      continue;
    }
    
    // Parse audio
    const audioMatch = line.match(/^audio\s+(\w+)(?:,\s*(.+))?$/);
    if (audioMatch) {
      const params: Record<string, number> = {};
      if (audioMatch[2]) {
        const paramParts = audioMatch[2].split(',').map(p => p.trim());
        for (const part of paramParts) {
          const [key, value] = part.split(':').map(s => s.trim());
          params[key] = parseFloat(value);
        }
      }
      statements.push({
        type: 'Audio',
        name: audioMatch[1],
        params,
      });
      continue;
    }
    
    // Parse method call (video operations)
    const methodMatch = line.match(/^(\w+)\.(\w+)\(([^)]*)\)$/);
    if (methodMatch) {
      const params: Record<string, number> = {};
      if (methodMatch[3]) {
        const paramParts = methodMatch[3].split(',').map(p => p.trim());
        for (const part of paramParts) {
          const [key, value] = part.split(':').map(s => s.trim());
          if (key && value) params[key] = parseFloat(value);
        }
      }
      statements.push({
        type: 'MethodCall',
        target: methodMatch[1],
        method: methodMatch[2],
        params,
      });
      continue;
    }
  }
  
  return { type: 'Program', statements };
}

function parseTime(timeStr: string): number {
  timeStr = timeStr.trim();
  
  // Handle "end" keyword
  if (timeStr === 'end') return Infinity;
  
  // Handle seconds with 's' suffix
  if (timeStr.endsWith('s')) {
    return parseFloat(timeStr.slice(0, -1));
  }
  
  // Handle mm:ss format
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(p => parseFloat(p));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  
  // Plain number
  return parseFloat(timeStr);
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
