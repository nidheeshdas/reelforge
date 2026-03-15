import { expect, test } from '@playwright/test';
import { getAccountNotice } from '../src/lib/account/account-notices';

test.describe('Account notices', () => {
  test('returns provider success notice when a connection completes', () => {
    expect(getAccountNotice({ connected: 'google-drive' })).toEqual({
      tone: 'success',
      title: 'Google Drive connected',
      description: 'Google Drive is ready to use from your account and asset workflows.',
    });
  });

  test('returns provider-specific configuration errors', () => {
    expect(getAccountNotice({ error: 'dropbox_not_configured' })).toEqual({
      tone: 'error',
      title: 'Dropbox is not configured',
      description: 'Add `DROPBOX_APP_KEY` and `DROPBOX_APP_SECRET` to your environment before connecting Dropbox.',
    });
  });

  test('falls back to a generic error notice for unknown codes', () => {
    expect(getAccountNotice({ error: 'unexpected_issue' })).toEqual({
      tone: 'error',
      title: 'Something went wrong',
      description: 'An unexpected account error occurred. Please try again.',
    });
  });
});
