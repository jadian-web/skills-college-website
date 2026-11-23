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
- **Change the set-up password first.** Sign in, open the **Account** tab and choose a new password
  (12+ characters, a mix of letters, numbers and symbols). A warning bar shows until you do.
  Changing it signs out every other device.
- Passwords are stored only as salted scrypt hashes (N=2^17, r=8, p=1) and checked in constant time.
- Sign-in is rate limited: 5 wrong passwords lock that connection for 15 minutes, repeat lockouts
  double (up to 24 hours), and 20 wrong passwords in an hour from anywhere lock sign-in for 30 minutes.
- No secrets are in the website's browser code. The session signing key is generated automatically
  and kept in Netlify Blobs (or set your own with the SESSION_SECRET environment variable).
- Sessions use a signed, HttpOnly, Secure, SameSite=Strict cookie and expire after 8 hours.
- Uploads are checked by file signature (JPG, PNG, WebP, GIF only) and all HTML is cleaned on the server.
- Forms: Netlify honeypot field, a minimum fill time, field validation, and the scorecard API is limited
  to 8 submissions per hour per connection. Netlify also filters form spam automatically.
- Security headers (netlify.toml): HTTPS-only (HSTS), Content Security Policy, no framing, no sniffing,
  restricted browser features.
- Keep the GitHub repository **private**.

## Force HTTPS (one-time check in Netlify)
Site configuration > Domain management > HTTPS: make sure the certificate is active. Netlify then
redirects every http:// request to https:// automatically, and the HSTS header tells browsers to
always use https. If you use both skillscollege.co.za and www.skillscollege.co.za, set the one you
prefer as the primary domain so the other redirects to it.

## Search engines and sharing
- `/sitemap.xml` is generated live (pages + published blog posts + events). Submit it once in
  Google Search Console.
- `robots.txt` points search engines to the sitemap.
- `/social-preview/` (not linked or indexed) shows how every page looks when shared.
- The social preview image can be replaced in the portal (Images > "Social media preview image").

## Editing website text (portal > Website text)
- Pick a page, change any heading, paragraph, list item, button label or number, and press **Save changes**.
  The live page updates within about a minute. **Reset to original** undoes a single change.
- Page titles and descriptions for Google and social media can be edited at the top of each page.
- How it works: every editable piece of text has a `data-c` key. Your edits are stored in Netlify Blobs and
  applied as each page is served by the edge function `netlify/edge-functions/site-content.js`.
  If that ever fails, the original page is shown, so the site never breaks.
- If the website is rebuilt with new wording for a piece of text, an edit you made to the old wording is
  kept in storage but no longer shown, so check the page in the portal after a redesign.

## Where things live
- `site/` - the public website (HTML, CSS, JS, original images, favicon, robots.txt, web manifest)
- `site/sc-console-67acf1609f/` - the portal page
- `netlify/functions/` - portal API, image server, blog, events, team and scorecard APIs, sitemap
- `netlify/edge-functions/` - applies edited website text to pages
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

## Portal lists added in the November 2026 audit update
- **Opportunities** tab: learnerships, internships, bursaries and skills programmes shown on
  `/learners/opportunities/` (each opens at `?id=...`). Closed opportunities stay visible, marked closed,
  for 30 days after the closing date and are then hidden automatically.
- **Qualifications** tab: the searchable directory on `/qcto/qualifications/` (search, NQF level, type,
  availability). Only list qualifications within the current accreditation scope.
- **Documents** tab: upload PDFs (max 4.5 MB, checked to be a real PDF). Category "PAIA manual" shows on
  `/paia-manual/`; all other categories show on `/about/accreditations-quality/`. Files download rather than
  open in the browser. Deleting a document deletes its file.
- **Testimonials** tab: client quotes shown at the bottom of the home page. The section stays hidden until one is
  published, and a testimonial can only be saved once you confirm the client approved it.
- **Partners** tab: partner logos (chosen from the image library) shown in a moving carousel after Our values on
  the home page. Hidden until a partner is published; with fewer than four logos they show as a still row.
- Case studies: publish a blog post with the category **Case Studies & Impact**. The About menu link
  appears automatically once one is published.
- Article, event and opportunity pages get their own title, description and link preview from the
  edge function when the page first loads.
- Any address other than skillscollege.co.za / www.skillscollege.co.za (staging, deploy previews,
  *.netlify.app) is sent with `X-Robots-Tag: noindex, nofollow`, so staging is never indexed.

## Uploading to GitHub in the browser (100 files per upload)
The project has just over 100 files, so upload it in two drags:
1. Everything **except** the `site/assets` folder.
2. The `site/assets` folder (drag it into the `site` folder in GitHub).
Do not upload `node_modules`.

## Removed files (delete these from the repository if they are still there)
`site/assets/data/stories.json`, `site/assets/data/articles.json`, `site/assets/data/qualifications.json`,
`site/favicon.png`. Case studies, articles and qualifications are now managed in the portal.
