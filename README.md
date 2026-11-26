# Jemputan — Digital Invitation Builder

GitHub-first multi-wedding invitation platform.

## Included
- `index.html` + `admin.js`: root dashboard, login, self-service account registration, show/hide password, multi-wedding management, live preview and publish.
- `invite.html` + `public.js`: public wedding invitation, five visual design templates, countdown, music, maps, RSVP, guestbook and optional slow auto-scroll after the guest opens the invitation. Auto-scroll pauses when the guest manually interacts.
- `Code.gs`: Google Apps Script API, user registration/login, per-user wedding access, drafts/publishing, RSVP and guestbook.
- `saas-config.js`: Apps Script API URL and GitHub Pages public base URL.

## Setup
1. Create a Google Sheet and open Extensions → Apps Script. Paste `Code.gs`.
2. In Script Properties, set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` (minimum 10 characters).
3. Run `setup()` once. It creates the required sheets and initial platform admin.
4. Run `seedFazleyZulaikhaWedding()` once. It renames an existing `fazley-roslina` record to `fazley-zulaikha` when found, otherwise creates a draft wedding. Review it before publishing.
5. Deploy Apps Script as Web App, Execute as Me, access Anyone.
6. Put the `/exec` URL into `API_URL` in `saas-config.js`. Keep `PUBLIC_BASE_URL` set to your GitHub Pages root URL.
7. Push the complete folder to GitHub Pages. Root URL opens the Jemputan dashboard. Public guest links use `invite.html?w=fazley-zulaikha`.

## Account registration
New users can register from the dashboard. Passwords must be at least 10 characters. The backend stores salted SHA-256 password hashes, never plaintext passwords. This is a lightweight MVP authentication flow; for a commercial launch, add rate limiting, email verification, password reset, abuse prevention and security review.

## Templates
`classic`, `botanical`, `modern`, `royal`, `minimal`. Select a template in the Design tab. The chosen design is stored with the wedding content and applied on the public invitation.

## Auto-scroll
Auto-scroll begins after the guest taps **BUKA JEMPUTAN**, at a gentle speed. It stops when the guest uses the wheel, touch, or keyboard, and can be toggled using the on-page control. It is disabled for visitors who prefer reduced motion.

## Important
- `musicUrl` expects a direct MP3 URL; browser audio playback requires the guest to tap the invitation button.
- Gallery uses direct image URLs; Drive upload integration is not yet wired.
- Unique per-wedding WhatsApp Open Graph previews need server-side metadata generation; this static GitHub Pages version uses shared metadata.
- Do not publish passwords or secret credentials in frontend files.
