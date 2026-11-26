# Wedora Studio — Wedding SaaS MVP

This starter turns the single Fazley & Roslina invitation into a multi-wedding platform MVP.

## Included
- `admin.html` + `admin.js`: private dashboard, login, create wedding projects, edit details/wording/music URL/gallery URLs/theme, live preview, save draft and publish.
- `index.html` + `public.js`: public invitation template loaded by slug (`?w=fazley-roslina`), countdown, music, maps, RSVP, guestbook.
- `Code.gs`: Google Apps Script API with users, sessions, weddings, RSVP and guestbook sheets; SHA-256 password hashing with per-user salt; owner/platform-admin access checks; draft/published content separation.
- `saas-config.js`: API endpoint and public base URL settings.

## Deployment
1. Create a new Google Sheet for the platform.
2. Open Extensions → Apps Script and replace the editor contents with `Code.gs`.
3. In Apps Script → Project Settings → Script Properties, add:
   - `PLATFORM_ADMIN_EMAIL` = your admin email
   - `PLATFORM_ADMIN_PASSWORD` = a strong initial password (at least 10 characters)
4. Run `setup()` once and authorize it. It creates the database tabs and platform admin.
5. Run `seedFazleyWedding()` once if you want the Fazley & Roslina starter project pre-created as a draft.
6. Deploy → New deployment → Web app. Execute as **Me**. Access: **Anyone**. Copy the `/exec` URL.
7. Paste that URL into `API_URL` in `saas-config.js`.
8. Set `PUBLIC_BASE_URL` to the public root of your static hosting, e.g. `https://your-site.netlify.app/` (keep trailing slash).
9. Upload the complete folder to Netlify or GitHub Pages.
10. Open `/admin.html`, sign in with the platform admin account, edit the Fazley & Roslina project and click **Publish**.
11. Public invitation URL format: `https://your-site.netlify.app/?w=fazley-roslina`.

## Creating other weddings
- Platform admin can create a project and an owner account by entering the owner's email and a temporary password.
- The owner signs in to `/admin.html`. Owners can create additional projects under their own account by using their existing email (the backend will not create a second account).
- Each wedding has its own slug and content record. Owners can only access projects assigned to their user ID.

## Important MVP limitations
- Media manager currently accepts direct image URLs and a direct MP3 URL; upload-to-Drive is not wired yet.
- Guestbook entries are currently published immediately. Add moderation before opening this to the public at scale.
- RSVP/guestbook data is stored in the shared spreadsheet with a wedding ID column. A dedicated RSVP analytics and moderation screen is a next phase.
- Static-host query-string pages cannot produce unique server-rendered Open Graph metadata per wedding. WhatsApp may show the generic platform preview. Per-wedding share cards require an edge/server-side metadata route or generated static pages.
- This is an MVP foundation, not a security audit. Before commercial launch, add rate limiting, stronger session revocation, account recovery, audit logs, privacy/consent controls, abuse prevention, storage quotas and backups. Protect the Apps Script project and spreadsheet; never publish admin credentials in frontend files.
- Browser autoplay rules still require a guest gesture before audible music can play.

## Data model
- `Users`: account identity, password hash + salt, role and active state.
- `Weddings`: tenant ID, slug, owner ID, draft JSON, published JSON and status.
- `Sessions`: hashed bearer token and expiry.
- `RSVP`: wedding ID + guest response.
- `Guestbook`: wedding ID + guest message + approval flag.
