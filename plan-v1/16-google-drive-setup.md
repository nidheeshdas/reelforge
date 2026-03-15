# Google Drive Setup for ReelForge

## What this enables

- The **Google Drive** connection card on `/account`
- The **Drive** tab in the asset workspace on `/assets` and in the editor assets panel
- OAuth token storage in the `ConnectedApp` table for the `google-drive` provider

## Environment variables

Add these values to `.env`:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-me"
ENCRYPTION_KEY="64-char-hex-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

## Google Cloud setup

1. Create or select a Google Cloud project.
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen for your app.
4. Create an **OAuth client ID** for a **Web application**.
5. Add these redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google-drive`
   - Production: `https://your-domain.example/api/auth/callback/google-drive`
6. Copy the client ID and client secret into `.env`.

## Local verification

1. Run `bun dev`.
2. Sign in to ReelForge.
3. Open `/account`.
4. Click **Connect** on the Google Drive card.
5. After the OAuth round-trip, confirm the success banner and open `/assets`.
6. Open the **Drive** tab and verify that file metadata loads.

## Code references

- `src/lib/integrations/google-drive.ts`
- `src/app/api/auth/connect/google-drive/route.ts`
- `src/app/api/auth/callback/google-drive/route.ts`
- `src/app/api/integrations/google-drive/files/route.ts`

## Notes

- ReelForge stores the OAuth access token in `ConnectedApp.accessToken`.
- Tokens are encrypted using `ENCRYPTION_KEY` before they are saved.
- `NEXTAUTH_URL` must exactly match the public origin used in the redirect URI.
