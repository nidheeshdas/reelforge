import { test, expect, describe } from '@playwright/test';
import { parseVidscript, validateVidscript, extractPlaceholders, fillPlaceholders } from '../src/parser';

describe('Parser', () => {
  test('should parse valid input statement', () => {
    const result = parseVidscript('input video = "test.mp4"');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements).toHaveLength(1);
    expect(result.ast?.statements[0]).toEqual({
      type: 'Input',
      name: 'video',
      path: 'test.mp4'
    });
  });

  test('should parse time block', () => {
    const result = parseVidscript('[0 - 10] = video');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements).toHaveLength(1);
    expect(result.ast?.statements[0].type).toBe('TimeBlock');
  });

  test('should parse filter', () => {
    const result = parseVidscript('[0 - 10] = filter "sepia", intensity: 0.5');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements[0].type).toBe('Filter');
    expect(result.ast?.statements[0].name).toBe('sepia');
  });

  test('should parse text instruction', () => {
    const result = parseVidscript('[2 - 5] = text "Hello World", style: title');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements[0].type).toBe('Text');
    expect(result.ast?.statements[0].content).toBe('Hello World');
  });

  test('should parse audio instruction', () => {
    const result = parseVidscript('[0 - 10] = audio music, volume: 0.7');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements[0].type).toBe('Audio');
  });

  test('should parse output statement', () => {
    const result = parseVidscript('output to "result.mp4", resolution: 1080x1920');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements[0].type).toBe('Output');
  });

  test('should handle comments', () => {
    const result = parseVidscript('# This is a comment\ninput video = "test.mp4"');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements).toHaveLength(1);
  });

  test('should validate valid code', () => {
    const result = validateVidscript('input video = "test.mp4"\n[0 - 10] = video');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should extract placeholders', () => {
    const placeholders = extractPlaceholders('input video = {{video1}}\ntext "{{title}}"');
    expect(placeholders).toContain('video1');
    expect(placeholders).toContain('title');
  });

  test('should fill placeholders', () => {
    const code = 'input video = {{video}}\ntext "{{name}}"';
    const filled = fillPlaceholders(code, { video: 'test.mp4', name: 'Hello' });
    expect(filled).toBe('input video = test.mp4\ntext "Hello"');
  });

  test('should use default placeholder values', () => {
    const code = 'input video = {{video | "default.mp4"}}';
    const filled = fillPlaceholders(code, {});
    expect(filled).toBe('input video = "default.mp4"');
  });

  test('should parse multiple time formats', () => {
    const result1 = parseVidscript('[0 - 10] = video');
    const result2 = parseVidscript('[0s - 10s] = video');
    const result3 = parseVidscript('[0:00 - 0:10] = video');
    
    expect(result1.errors).toHaveLength(0);
    expect(result2.errors).toHaveLength(0);
    expect(result3.errors).toHaveLength(0);
  });

  test('should parse method calls', () => {
    const result = parseVidscript('[0 - 10] = video.Trim(0, 30)');
    expect(result.errors).toHaveLength(0);
    expect(result.ast?.statements[0].type).toBe('MethodCall');
  });
});
