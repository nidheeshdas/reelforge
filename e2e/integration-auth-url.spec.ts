import { expect, test } from '@playwright/test';
import { GoogleDriveService } from '../src/lib/integrations/google-drive';
import { DropboxService } from '../src/lib/integrations/dropbox';
import { getSafeCallbackPath } from '../src/lib/integrations/oauth-state';

test.describe('Integration auth URLs', () => {
  test.beforeEach(() => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.DROPBOX_APP_KEY = 'dropbox-app-key';
    process.env.DROPBOX_APP_SECRET = 'dropbox-app-secret';
  });

  test('normalizes callback paths for provider redirects', () => {
    expect(getSafeCallbackPath('/editor/github')).toBe('/editor/github');
    expect(getSafeCallbackPath('https://malicious.example.com')).toBe('/account');
    expect(getSafeCallbackPath('//double-slash')).toBe('/account');
    expect(getSafeCallbackPath(undefined, '/assets')).toBe('/assets');
  });

  test('builds a Google Drive OAuth URL with redirect and state', () => {
    const url = new URL(GoogleDriveService.getAuthUrl('/editor/github'));

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback/google-drive');
    expect(url.searchParams.get('state')).toBe('/editor/github');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/drive.readonly');
  });

  test('builds a Dropbox OAuth URL with redirect and state', () => {
    const url = new URL(DropboxService.getAuthUrl('/assets'));

    expect(url.origin).toBe('https://www.dropbox.com');
    expect(url.searchParams.get('client_id')).toBe('dropbox-app-key');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback/dropbox');
    expect(url.searchParams.get('state')).toBe('/assets');
    expect(url.searchParams.get('token_access_type')).toBe('offline');
  });
});
