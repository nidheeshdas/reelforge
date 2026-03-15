export interface AccountNotice {
  tone: 'success' | 'error';
  title: string;
  description: string;
}

const CONNECTED_PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox',
};

const ERROR_MESSAGES: Record<string, Omit<AccountNotice, 'tone'>> = {
  not_authenticated: {
    title: 'Sign in required',
    description: 'Please sign in before connecting an external provider.',
  },
  github_not_configured: {
    title: 'GitHub is not configured',
    description: 'Add `GITHUB_ID` and `GITHUB_SECRET` to your environment before connecting GitHub.',
  },
  google_drive_not_configured: {
    title: 'Google Drive is not configured',
    description: 'Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your environment before connecting Google Drive.',
  },
  dropbox_not_configured: {
    title: 'Dropbox is not configured',
    description: 'Add `DROPBOX_APP_KEY` and `DROPBOX_APP_SECRET` to your environment before connecting Dropbox.',
  },
  github_connection_failed: {
    title: 'GitHub connection failed',
    description: 'GitHub did not finish the OAuth flow. Check the callback URL and try again.',
  },
  google_drive_connection_failed: {
    title: 'Google Drive connection failed',
    description: 'Google Drive did not finish the OAuth flow. Check the callback URL and consent screen setup.',
  },
  dropbox_connection_failed: {
    title: 'Dropbox connection failed',
    description: 'Dropbox did not finish the OAuth flow. Check the callback URL and app settings, then retry.',
  },
  github_code_missing: {
    title: 'GitHub callback was incomplete',
    description: 'GitHub returned without an authorization code. Start the connection flow again.',
  },
  google_drive_code_missing: {
    title: 'Google Drive callback was incomplete',
    description: 'Google Drive returned without an authorization code. Start the connection flow again.',
  },
  dropbox_code_missing: {
    title: 'Dropbox callback was incomplete',
    description: 'Dropbox returned without an authorization code. Start the connection flow again.',
  },
  connection_failed: {
    title: 'Connection failed',
    description: 'The provider connection could not be completed. Check your configuration and try again.',
  },
};

export function getAccountNotice({
  connected,
  error,
}: {
  connected?: string | null;
  error?: string | null;
}): AccountNotice | null {
  if (connected) {
    const label = CONNECTED_PROVIDER_LABELS[connected] || connected;
    return {
      tone: 'success',
      title: `${label} connected`,
      description: `${label} is ready to use from your account and asset workflows.`,
    };
  }

  if (!error) {
    return null;
  }

  const errorNotice = ERROR_MESSAGES[error];
  if (errorNotice) {
    return {
      tone: 'error',
      ...errorNotice,
    };
  }

  return {
    tone: 'error',
    title: 'Something went wrong',
    description: 'An unexpected account error occurred. Please try again.',
  };
}
