import { test, expect } from '@playwright/test';
import { compileVidscript } from '../src/parser';
import { extractRenderScriptConfig } from '../src/render/render-config';

const moduleMap = {
  './pack.vid': `
export const DEFAULT_DURATION = 4s
export const BRAND_COLOR = "#f97316"
export timeline intro(hero: video, headline: text, cta: text = "Visit today") {
  [0s - DEFAULT_DURATION] = hero.Trim(0, DEFAULT_DURATION)
  [0.5s - 2s] = text headline, style: title, color: BRAND_COLOR
  [3s - end] = text cta, style: caption
}
export timeline wrapper(hero: video, headline: text) {
  use intro at 1s with { hero: hero, headline: headline }
}
  `,
  './namespace-pack.vid': `
export const DURATION = 2s
export timeline bump(hero: video) {
  [0s - DURATION] = hero
}
  `,
};

test.describe('Linker', () => {
  test('should resolve named imports and lower imported timelines', () => {
    const result = compileVidscript(`
import { intro } from "./pack.vid"
input main = "hero.mp4"
use intro at 2s with { hero: main, headline: "North Roast" }
output to "linked.mp4"
    `, { moduleMap });

    expect(result.errors).toHaveLength(0);
    expect(result.program?.statements).toMatchObject([
      { type: 'Input', name: 'main' },
      {
        type: 'TimeBlock',
        start: { value: 2 },
        end: { value: 6 },
        instructions: [
          { type: 'VideoTrim', target: 'main', params: { start: 0, end: 4 } },
        ],
      },
      {
        type: 'TimeBlock',
        start: { value: 2.5 },
        end: { value: 4 },
        instructions: [
          { type: 'Text', content: 'North Roast', params: { style: 'title', color: '#f97316' } },
        ],
      },
      {
        type: 'TimeBlock',
        start: { value: 5 },
        end: { value: Infinity },
        instructions: [
          { type: 'Text', content: 'Visit today', params: { style: 'caption' } },
        ],
      },
      { type: 'Output', path: 'linked.mp4' },
    ]);
  });

  test('should resolve namespace imports and nested timeline offsets', () => {
    const result = compileVidscript(`
import { wrapper } from "./pack.vid"
import * as ns from "./namespace-pack.vid"
input main = "hero.mp4"
use wrapper at 2s with { hero: main, headline: "Launch" }
use ns.bump at 10s with { hero: main }
    `, { moduleMap });

    expect(result.errors).toHaveLength(0);
    const timeBlocks = result.program?.statements.filter((statement) => statement.type === 'TimeBlock') ?? [];
    expect(timeBlocks).toHaveLength(4);
    expect(timeBlocks).toMatchObject([
      { start: { value: 3 }, end: { value: 7 } },
      { start: { value: 3.5 }, end: { value: 5 } },
      { start: { value: 6 }, end: { value: Infinity } },
      { start: { value: 10 }, end: { value: 12 }, instructions: ['main'] },
    ]);
  });

  test('should reject duplicate exports', () => {
    const result = compileVidscript('export const A = 1\nexport const A = 2');
    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Duplicate export 'A' in module '__entry__.vid'");
  });

  test('should reject missing imports', () => {
    const result = compileVidscript('import { missing } from "./pack.vid"', { moduleMap });
    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Module './pack.vid' does not export 'missing'");
  });

  test('should reject module cycles', () => {
    const result = compileVidscript('import { intro } from "./a.vid"\nuse intro at 0s with {}', {
      moduleMap: {
        './a.vid': 'import { intro } from "./b.vid"\nexport timeline intro() { use intro at 0s with {} }',
        './b.vid': 'import { intro } from "./a.vid"\nexport timeline intro() { use intro at 0s with {} }',
      },
    });

    expect(result.program).toBeNull();
    expect(result.errors.some((error) => error.message.includes('Module cycle detected'))).toBe(true);
  });

  test('should reject recursive timeline expansion', () => {
    const result = compileVidscript(`
export timeline intro() {
  use intro at 0s with {}
}
use intro at 0s with {}
    `);

    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain(
      "Timeline expansion cycle detected: __entry__.vid:intro -> __entry__.vid:intro",
    );
  });

  test('should reject using non-timeline exports', () => {
    const result = compileVidscript('export const intro = 1\nuse intro at 0s with {}');
    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Unknown timeline 'intro'");
  });

  test('should reject missing required params', () => {
    const result = compileVidscript('import { intro } from "./pack.vid"\nuse intro at 0s with { hero: main }', { moduleMap });
    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Missing required param 'headline' for timeline 'intro'");
  });

  test('should reject unknown params', () => {
    const result = compileVidscript('import { intro } from "./pack.vid"\nuse intro at 0s with { hero: main, headline: "Hello", extra: true }', { moduleMap });
    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Unknown param 'extra' for timeline 'intro'");
  });

  test('should reject unsupported top-level statements in imported modules', () => {
    const result = compileVidscript('import { intro } from "./bad.vid"\nuse intro at 0s with {}', {
      moduleMap: {
        './bad.vid': 'input main = "hero.mp4"\nexport timeline intro() { [0 - 1] = main }',
      },
    });

    expect(result.program).toBeNull();
    expect(result.errors.map((error) => error.message)).toContain("Unsupported top-level statement 'Input' in imported module './bad.vid'");
  });

  test('should feed lowered linked output into render config extraction', () => {
    const config = extractRenderScriptConfig(`
import { intro } from "./pack.vid"
input main = "hero.mp4"
use intro at 0s with { hero: main, headline: "North Roast" }
output to "coffee-launch.mp4", resolution: 1080x1080
    `, undefined, { moduleMap });

    expect(config).toMatchObject({
      outputFilename: 'coffee-launch.mp4',
      resolutionKey: '1080x1080',
      resolution: { width: 1080, height: 1080 },
    });

    const compiledConfig = extractRenderScriptConfig(`
output to "coffee-launch.mp4", resolution: 1080x1080
    `);

    expect(compiledConfig.outputFilename).toBe('coffee-launch.mp4');
  });
});
