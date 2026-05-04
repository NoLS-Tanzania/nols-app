# Aiven MySQL Staging Setup

Use Aiven MySQL as the isolated staging database for the Render staging API.

## Database URL

Aiven gives a URL like:

```env
DATABASE_URL=mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED
```

Do not commit the real value to the repo. Put it only in Render's staging API environment variables.

## Render Staging API

Set these on the Render staging API service:

```env
NODE_ENV=production
DATABASE_URL=mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED
CORS_ORIGIN=https://<vercel-staging-domain>
WEB_ORIGIN=https://<vercel-staging-domain>
APP_ORIGIN=https://<vercel-staging-domain>
JWT_SECRET=<staging-only-secret>
ENCRYPTION_KEY=<staging-only-key>
MAPBOX_ACCESS_TOKEN=<mapbox-token>
NEXT_PUBLIC_MAPBOX_TOKEN=<mapbox-public-token>
```

Keep `COOKIE_DOMAIN` blank unless staging uses a stable custom parent domain shared by web and API.

## Load Schema

After setting `DATABASE_URL` locally for this one command, push the Prisma schema into Aiven:

```powershell
$env:DATABASE_URL="mysql://avnadmin:<password>@<host>.aivencloud.com:<port>/defaultdb?ssl-mode=REQUIRED"
npm run prisma:push
```

Then run the API smoke test against Render staging after deployment:

```powershell
$env:API_URL="https://<render-staging-api-domain>"
npm run smoke-test
```

## Security Note

If a real database password is pasted into chat, issue trackers, screenshots, or shared docs, rotate the Aiven password before using staging seriously.
