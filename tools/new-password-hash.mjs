// Optional: create a password hash for the ADMIN_PASSWORD_HASH environment variable.
// You normally do not need this: change the password in the portal (Account tab) instead.
//   node tools/new-password-hash.mjs "Your-New-Long-Password"
import crypto from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error("Give a password of at least 12 characters."); process.exit(1); }
const N = 131072, r = 8, p = 1;
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(pw, salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 }).toString("hex");
console.log("ADMIN_PASSWORD_HASH=" + `scrypt2$${N}$${r}$${p}$${salt}$${hash}`);
console.log("SESSION_SECRET=" + crypto.randomBytes(32).toString("hex") + "   (optional; one is generated automatically)");
