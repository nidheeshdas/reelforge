# Cloudflare R2 Setup for ReelForge

## Current implementation status

Cloudflare R2 is currently a **documented/planned** storage target in this repository. The account UI now surfaces the expected keys, and `.env.example` includes R2 placeholders, but the active asset upload flow still writes to the local upload directory instead of R2.

## Expected environment variables

Add these values to `.env` when you are ready to implement or deploy R2-backed asset storage:

```env
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET="your-r2-bucket-name"
R2_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://cdn.example.com"
```

## Cloudflare setup

1. Create an R2 bucket in your Cloudflare account.
2. Generate an R2 access key pair with access to that bucket.
3. Copy the account ID, access key ID, secret access key, and bucket name into `.env`.
4. Decide whether assets should be served through:
   - the raw R2 endpoint, or
   - a custom public CDN/domain stored in `R2_PUBLIC_URL`.

## ReelForge integration notes

When R2 wiring is implemented, the asset API should:

- upload user assets into `R2_BUCKET`
- persist the resulting object key alongside the asset record
- generate a stable public URL using `R2_PUBLIC_URL` or the bucket endpoint
- keep local development fallback behavior for environments without R2 credentials

## Code and plan references

- `.env.example`
- `plan-v1/15-business-use-cases.md`
- `src/app/account/page.tsx`

## Verification checklist for a future R2 rollout

- Asset uploads succeed without writing to the local disk path
- Imported assets resolve to the R2-backed public URL
- Deletes remove both the database record and the R2 object
- The editor assets panel and `/assets` page continue to work with the new storage backend
