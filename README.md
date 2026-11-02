# Skills College website + management portal

## What changed from the drag-and-drop version
The management portal runs on Netlify Functions and stores images and blog
posts in Netlify Blobs. Netlify's drag-and-drop upload does **not** deploy
functions, so this version is deployed with the Netlify command-line tool
(one script) or from a GitHub repository.

## Deploy (Windows)
1. Install Node.js LTS from https://nodejs.org (one time).
2. Unzip this folder and double-click `deploy-windows.bat`.
3. First time only: log in to Netlify in the browser window that opens, then
   pick your existing Skills College site (or create a new one).

Mac/Linux: run `./deploy-mac-linux.sh`.

Alternative: push this folder to a private GitHub repo and connect it in
Netlify (Add new site > Import from Git). No build command is needed.

## Opening the portal
There is no link or menu item to it. On any page, **click the (c) copyright
symbol in the footer 5 times quickly** (within about 2 seconds). You can also
bookmark the address it opens.

## Security (please read)
- The password is stored only as a salted scrypt hash, never in plain text.
- Sessions use a signed, HttpOnly, Secure, SameSite=Strict cookie and expire
  after 8 hours.
- After 5 wrong passwords the sign-in is locked for 15 minutes per address.
- Uploads are checked by file signature (JPG, PNG, WebP, GIF only; no SVG)
  and blog HTML is cleaned on the server before it is published.
- The portal page is marked noindex and is not linked or listed anywhere.
  Hiding it keeps casual visitors away; the password is what protects it.

**Strongly recommended after the first deploy:** in Netlify go to
Site configuration > Environment variables and add:
- `ADMIN_PASSWORD_HASH` - run `node tools/new-password-hash.mjs "NewPassword"`
  and paste the first line. (The password was shared in a chat, so change it.)
- `SESSION_SECRET` - the second value printed by the same command.
- `ADMIN_USERNAME` - optional, defaults to `jadian`.
Then redeploy. Changing SESSION_SECRET signs everyone out.

## Where things live
- `site/` - the public website (HTML, CSS, JS, original images)
- `site/sc-console-67acf1609f/` - the portal page
- `netlify/functions/` - portal API, image server and blog API
- Images on pages load from `/media/<file>`: the portal's replacement if one
  exists, otherwise the original in `site/assets/img/`.
- Blog posts appear on `/resources/` and open at `/resources/article/?slug=...`.
- Events appear on `/about/events/` and open at `/about/events/?event=...`
  (managed in the portal's Events tab).
- The B-BBEE calculator is at `/b-bbee-scorecard-calculator/`. Results are
  saved to the portal's "Scorecard results" tab and sent through Netlify Forms
  (form name `scorecard`).

## Email scorecard results to sales@skillscollege.co.za (one-time setup)
1. Netlify > your site > Forms: make sure form detection is enabled, then
   redeploy once so the `scorecard` form is detected.
2. Netlify > Site configuration > Notifications > Emails and webhooks >
   Form submission notifications > Add notification > Email notification.
3. Event: "New form submission", Form: `scorecard`,
   Email: sales@skillscollege.co.za. Save.
Every calculator result then arrives by email, and is also listed in the portal.
