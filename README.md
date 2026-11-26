# Jemputan Digital Fazley & Roslina

Malay Kampung Garden style wedding invitation starter.

## Included
- Responsive interactive invitation with opening envelope
- Wedding countdown to 19 December 2026
- Optional background music (use an MP3 URL you own or are licensed to use)
- Venue and Google Maps link placeholders
- RSVP and guestbook backed by Google Sheets via Apps Script

## Setup

### 1. Google Sheets + Apps Script
1. Create a blank Google Sheet.
2. Open Extensions → Apps Script.
3. Replace the editor contents with `Code.gs`.
4. Save, select `setup` and Run once. Approve permissions.
5. Deploy → New deployment → Web app.
6. Execute as: Me. Who has access: Anyone.
7. Deploy and copy the Web app URL ending in `/exec`.

### 2. Configure website
Open `config.js` and fill:
- `APPS_SCRIPT_URL`: your Apps Script `/exec` URL
- `MUSIC_URL`: optional direct MP3 URL (licensed/owned audio)
- `VENUE_NAME`, `VENUE_ADDRESS`, `MAPS_URL`: when confirmed

### 3. Publish
Upload `index.html`, `config.js`, and `app.js` to a GitHub repository.
Enable GitHub Pages in repository Settings → Pages → Deploy from branch.

## Important
- Venue is intentionally left as TBC; no map link is shown until configured.
- The RSVP/guestbook will not submit until Apps Script is deployed and its URL is configured.
- Browser audio requires a user gesture; playback begins after the guest opens the invitation.
- For public wedding use, test RSVP and guestbook from a phone before sharing the link.
