// Usage: node tools/new-password-hash.mjs "YourNewPassword"
// Copy the printed value into Netlify: Site configuration > Environment variables > ADMIN_PASSWORD_HASH
import crypto from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 10) { console.error("Give a password of at least 10 characters."); process.exit(1); }
const salt = crypto.randomBytes(16).toString("hex");
console.log("scrypt$" + salt + "$" + crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex"));
console.log("\nAlso set SESSION_SECRET to:\n" + crypto.randomBytes(32).toString("hex"));
