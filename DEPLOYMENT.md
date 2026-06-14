# Deployment

## Vercel

This app is configured for Vercel with TanStack Start and Nitro.

Use the default Vercel settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output: generated automatically by Nitro in `.vercel/output`

Required environment variables:

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

The backend must also be deployed with matching Google OAuth and JWT settings.

Local verification:

```bash
npm run build
```

To test the exact Vercel output locally:

```bash
$env:VERCEL='1'; npm run build
```
