const DEFAULT_CALLBACK_PATH = '/account';

export function getSafeCallbackPath(value: string | null | undefined, fallback = DEFAULT_CALLBACK_PATH) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}
