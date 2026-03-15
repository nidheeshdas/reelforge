# Dropbox Setup for ReelForge

## What this enables

- The **Dropbox** connection card on `/account`
- The **Dropbox** tab in the asset workspace on `/assets` and in the editor assets panel
- OAuth token storage in the `ConnectedApp` table for the `dropbox` provider

## Environment variables

Add these values to `.env`:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-me"
ENCRYPTION_KEY="64-char-hex-key"
DROPBOX_APP_KEY="your-dropbox-app-key"
DROPBOX_APP_SECRET="your-dropbox-app-secret"
```

## Dropbox app setup

1. Create a Dropbox app in the Dropbox developer console.
2. Choose **Scoped access** and the appropriate app folder/full Dropbox access model for your use case.
3. Add the redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/dropbox`
   - Production: `https://your-domain.example/api/auth/callback/dropbox`
4. Copy the **App key** and **App secret** into `.env`.

## Local verification

1. Run `bun dev`.
2. Sign in to ReelForge.
3. Open `/account`.
4. Click **Connect** on the Dropbox card.
5. After the OAuth round-trip, confirm the success banner and open `/assets`.
6. Open the **Dropbox** tab and verify that file metadata loads.

## Code references

- `src/lib/integrations/dropbox.ts`
- `src/app/api/auth/connect/dropbox/route.ts`
- `src/app/api/auth/callback/dropbox/route.ts`
- `src/app/api/integrations/dropbox/files/route.ts`

## Notes

- ReelForge stores the OAuth access token in `ConnectedApp.accessToken`.
- Tokens are encrypted using `ENCRYPTION_KEY` before they are saved.
- Dropbox uses the `token_access_type=offline` flow so refresh-capable tokens can be requested.
