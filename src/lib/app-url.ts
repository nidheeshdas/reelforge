export function getAppUrl(fallbackOrigin?: string): string {
  if (fallbackOrigin) {
    return fallbackOrigin.replace(/\/$/, '');
  }

  const configured = process.env.NEXTAUTH_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
