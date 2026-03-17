import { Container } from '@cloudflare/containers';

export class RenderContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '10m';
  envVars = {
    PORT: '8080',
    RENDER_EXECUTION_MODE: 'cloudflare-container',
  };

  override onStart() {
    console.log('Render container started');
  }

  override onStop() {
    console.log('Render container stopped');
  }

  override onError(error: unknown) {
    console.error('Render container error', error);
    throw error;
  }
}
