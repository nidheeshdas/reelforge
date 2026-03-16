import { expect, test } from '@playwright/test';
import { withHeadlessRender } from './helpers/headless-render';

const smokeVidscript = `input main_video = "/samples/test-video.mp4"
[0s - 1s] = main_video.Trim(0, 1)
output to "smoke-render.mp4", resolution: 96x96`;

test.describe('Headless render harness', () => {
  test('renders an mp4 with basic metadata', async () => {
    test.slow();

    await withHeadlessRender(
      {
        vidscript: smokeVidscript,
        resolution: { width: 96, height: 96 },
        fps: 1,
      },
      async (artifact) => {
        expect(artifact.outputUrl).toMatch(/^\/renders\/\d+\.mp4$/);
        expect(artifact.size).toBeGreaterThan(0);
        expect(artifact.codec).toBe('h264');
        expect(artifact.width).toBe(96);
        expect(artifact.height).toBe(96);
        expect(artifact.pixFmt).toBe('yuv420p');
      },
    );
  });
});
