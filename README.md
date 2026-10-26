# Skills College website + management portal

## How this is deployed (no installs needed)
The portal runs on Netlify Functions, which Netlify's drag-and-drop page
cannot deploy. Instead, the files live in a private GitHub repository and
Netlify builds the site from it automatically. Everything is done in a browser.

1. GitHub: create a free account, then New repository > name it
   `skills-college-website` > Private > Create.
2. On the empty repository page click "uploading an existing file", drag in
   everything INSIDE this folder (not the folder itself), then Commit changes.
3. Netlify: Add new site > Import an existing project > GitHub > choose the
   repository. Leave the build settings as they are and click Deploy.
4. To use your existing domain, open Domain management on the new site and
   move the domain from the old drag-and-drop site.

To update files later: open the file on GitHub, click the pencil (or Add file
> Upload files), commit, and Netlify republishes within a minute.

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
- `ADMIN_PASSWORD_HASH` - ask Claude (or a developer) for a new hash, or run
  `tools/new-password-hash.mjs` with Node, and paste the first line. (The password was shared in a chat, so change it.)
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
