import { expect, test } from '@playwright/test';
import { withHeadlessRender } from './helpers/headless-render';
import type { HeadlessRenderArtifact } from './helpers/headless-render';

const SAMPLE_VIDEO = '/samples/test-video.mp4';

interface RenderExpectation {
  width: number;
  height: number;
  fps?: number;
  minSize: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
}

async function expectRenderedMp4(
  vidscript: string,
  {
    width,
    height,
    fps = 2,
    minSize,
    maxSize = 2_000_000,
    minDuration = 9.5,
    maxDuration = 10.5,
  }: RenderExpectation,
): Promise<void> {
  await withHeadlessRender(
    {
      vidscript,
      resolution: { width, height },
      fps,
    },
    async (artifact: HeadlessRenderArtifact) => {
      expect(artifact.outputUrl).toMatch(/^\/renders\/\d+\.mp4$/);
      expect(artifact.codec).toBe('h264');
      expect(artifact.width).toBe(width);
      expect(artifact.height).toBe(height);
      expect(artifact.pixFmt).toBe('yuv420p');
      expect(artifact.duration).not.toBeNull();
      expect(artifact.duration!).toBeGreaterThanOrEqual(minDuration);
      expect(artifact.duration!).toBeLessThanOrEqual(maxDuration);
      expect(artifact.size).toBeGreaterThan(minSize);
      expect(artifact.size).toBeLessThan(maxSize);
    },
  );
}

test.describe('Headless render construct coverage', () => {
  test('renders trim, resize, speed, loop, and opacity constructs together', async () => {
    test.slow();

    await expectRenderedMp4(
      `input main = "${SAMPLE_VIDEO}"

[0s - 2s] = main.Trim(0, 1)
[2s - 4s] = main.Resize(96, 96)
[4s - 6s] = main.Speed(2)
[6s - 8s] = main.Loop(2)
[8s - 10s] = main.Opacity(0.5, 1)

output to "construct-transform.mp4", resolution: 96x96`,
      {
        width: 96,
        height: 96,
        minSize: 1_500,
      },
    );
  });

  test('renders overlay and composite layers in a single server-side pass', async () => {
    test.slow();

    await expectRenderedMp4(
      `input base = "${SAMPLE_VIDEO}"
input inset = "${SAMPLE_VIDEO}"
input badge = "${SAMPLE_VIDEO}"

[0s - 2s] = base
[2s - 4s] = base.Overlay(inset, x: 8, y: 8, opacity: 0.65)
[4s - 6s] = base.Composite(badge, x: 28, y: 28, opacity: 0.35)

output to "construct-layered.mp4", resolution: 128x128`,
      {
        width: 128,
        height: 128,
        minSize: 2_000,
      },
    );
  });

  test('renders text, filter, and shader effects without a browser page', async () => {
    test.slow();

    await expectRenderedMp4(
      `input main = "${SAMPLE_VIDEO}"

[0s - 2s] = main
[0s - 2s] = text "Construct FX", style: title, position: center, color: white
[0s - 2s] = filter "sepia", intensity: 0.7
[0s - 2s] = shader "monochrome", intensity: 0.3

output to "construct-effects.mp4", resolution: 120x120`,
      {
        width: 120,
        height: 120,
        minSize: 2_000,
      },
    );
  });
});
