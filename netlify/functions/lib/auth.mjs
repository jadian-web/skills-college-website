// Authentication helpers for the Skills College management portal.
//
// Passwords are never stored in plain text. They are hashed with scrypt (memory-hard,
// N = 2^17, r = 8, p = 1, 16-byte random salt) and compared in constant time.
//
// Where the password hash comes from (first match wins):
//   1. Netlify environment variable ADMIN_PASSWORD_HASH (optional)
//   2. The hash saved when the password is changed in the portal (Netlify Blobs)
//   3. The original set-up hash below (the portal asks you to change it)
//
// The session signing key is never in the code: it comes from the SESSION_SECRET environment
// variable or, if that is not set, a random 256-bit key generated on first use and kept in Netlify Blobs.
import crypto from "node:crypto";
import { store } from "./stores.mjs";

const DEFAULT_USER = "jadian";
// Set-up password hash (legacy format scrypt$salt$hash, N = 2^14). Replaced as soon as the password is changed.
const SETUP_HASH =
  "scrypt$e21e6294fb8e9a4b9744624125b3c5cf$2694596803231e34a74599454062bf88d8f039803e9c043a490c3fc44f3e51399a8bebd5c78c258cf31c5e3d0f31ab3920c00b2fb0a4928455ea96a5dad3f48f";

const env = (k) => (typeof Netlify !== "undefined" && Netlify.env?.get(k)) || process.env[k] || "";
const USERNAME = () => (env("ADMIN_USERNAME") || DEFAULT_USER).toLowerCase();
const auth = () => store("sc-auth");

export const COOKIE = "__Host-sc_session";
const SESSION_HOURS = 8;
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

// ---------------------------------------------------------------- hashing
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64, SCRYPT).toString("hex");
  return `scrypt2$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${hash}`;
}
function checkHash(password, stored) {
  const parts = String(stored || "").split("$");
  let salt, hash, opts;
  if (parts[0] === "scrypt2" && parts.length === 6) {
    const N = +parts[1], r = +parts[2], p = +parts[3];
    opts = { N, r, p, maxmem: Math.max(64 * 1024 * 1024, 256 * N * r) };
    salt = parts[4]; hash = parts[5];
  } else if (parts[0] === "scrypt" && parts.length === 3) {
    opts = { N: 16384, r: 8, p: 1 }; salt = parts[1]; hash = parts[2];
  } else {
    // unknown format: still spend the same effort so timing reveals nothing
    crypto.scryptSync(String(password || ""), "x", 64, SCRYPT);
    return false;
  }
  const calc = crypto.scryptSync(String(password || ""), salt, 64, opts).toString("hex");
  return safeEqual(calc, hash);
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ---------------------------------------------------------------- stored credentials
let cache = null;
async function creds() {
  if (cache && cache.at > Date.now() - 30000) return cache;
  let rec = null;
  try { rec = await auth().get("admin", { type: "json" }); } catch (e) { console.error("auth store read failed", e); }
  const envHash = env("ADMIN_PASSWORD_HASH");
  cache = {
    at: Date.now(),
    hash: envHash || rec?.hash || SETUP_HASH,
    source: envHash ? "environment" : rec?.hash ? "portal" : "setup",
    version: rec?.version || 1,
    changedAt: rec?.changedAt || null,
  };
  return cache;
}

let secretCache = "";
async function secret() {
  const fromEnv = env("SESSION_SECRET");
  if (fromEnv) return fromEnv;
  if (secretCache) return secretCache;
  const s = auth();
  let rec = await s.get("session-key", { type: "json" });
  if (!rec?.key) {
    rec = { key: crypto.randomBytes(32).toString("hex"), createdAt: new Date().toISOString() };
    await s.setJSON("session-key", rec);
    rec = (await s.get("session-key", { type: "json" })) || rec; // keep whichever key was saved first
  }
  secretCache = rec.key;
  return secretCache;
}

export async function verifyPassword(user, password) {
  const c = await creds();
  const passOk = checkHash(password, c.hash);            // always runs, so timing does not reveal the username
  const userOk = safeEqual(String(user || "").trim().toLowerCase(), USERNAME());
  return passOk && userOk;
}

export async function credentialStatus() {
  const c = await creds();
  return { usingSetupPassword: c.source === "setup", source: c.source, changedAt: c.changedAt };
}

// Password rules: 12+ characters, at least 3 of upper / lower / number / symbol, not the username or a common pattern
export function passwordProblems(pw, user = USERNAME()) {
  pw = String(pw || "");
  const out = [];
  if (pw.length < 12) out.push("at least 12 characters");
  if (pw.length > 128) out.push("no more than 128 characters");
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) out.push("at least three of: lowercase, uppercase, numbers, symbols");
  const low = pw.toLowerCase();
  if (user && low.includes(user)) out.push("must not contain the username");
  if (/(password|skills ?college|skills2026|qwerty|123456|letmein|welcome)/i.test(pw)) out.push("must not use a common word or pattern");
  if (/(.)\1{3,}/.test(pw)) out.push("must not repeat the same character 4 or more times");
  return out;
}

export async function changePassword(newPassword) {
  const s = auth();
  const old = (await s.get("admin", { type: "json" })) || {};
  const rec = { hash: hashPassword(newPassword), version: (old.version || 1) + 1, changedAt: new Date().toISOString() };
  await s.setJSON("admin", rec);
  cache = null;
  return rec.version;
}

// ---------------------------------------------------------------- sessions
async function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export async function createSessionCookie() {
  const c = await creds();
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const token = await sign({ u: USERNAME(), exp, v: c.version, n: crypto.randomBytes(8).toString("hex") });
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Returns the session, or null. Sessions end when they expire or when the password is changed.
export async function readSession(req) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!m) return null;
  const [body, mac] = m.slice(COOKIE.length + 1).split(".");
  if (!body || !mac) return null;
  const expect = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  if (!safeEqual(mac, expect)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!p.exp || p.exp < Date.now()) return null;
    const c = await creds();
    if ((p.v || 1) !== c.version) return null;
    return p;
  } catch { return null; }
}

// ---------------------------------------------------------------- brute-force protection
// Per address: 5 wrong passwords lock that address for 15 minutes; each further lock doubles (max 24 hours).
// Whole account: 20 wrong passwords within an hour, from any addresses, lock sign-in for 30 minutes.
const guard = () => store("sc-login-guard");
const ipKey = (ip) => "ip-" + crypto.createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 32);
const MAX_FAILS = 5, BASE_LOCK_MIN = 15, MAX_LOCK_MIN = 24 * 60;
const ACCOUNT_MAX = 20, ACCOUNT_WINDOW_MIN = 60, ACCOUNT_LOCK_MIN = 30;

export async function isLocked(ip) {
  try {
    const [rec, acc] = await Promise.all([guard().get(ipKey(ip), { type: "json" }), guard().get("account", { type: "json" })]);
    const until = Math.max(rec?.lockedUntil || 0, acc?.lockedUntil || 0);
    return until > Date.now() ? until : 0;
  } catch (e) { console.error("login guard read failed", e); return 0; }
}
export async function recordFail(ip) {
  try {
    const k = ipKey(ip), now = Date.now();
    const rec = (await guard().get(k, { type: "json" })) || { fails: 0, locks: 0 };
    rec.fails = (rec.fails || 0) + 1;
    if (rec.fails >= MAX_FAILS) {
      rec.locks = (rec.locks || 0) + 1;
      rec.lockedUntil = now + Math.min(MAX_LOCK_MIN, BASE_LOCK_MIN * 2 ** (rec.locks - 1)) * 60000;
      rec.fails = 0;
    }
    rec.last = now;
    await guard().setJSON(k, rec);
    const acc = (await guard().get("account", { type: "json" })) || { hits: [] };
    acc.hits = (acc.hits || []).filter((t) => t > now - ACCOUNT_WINDOW_MIN * 60000).concat(now).slice(-100);
    if (acc.hits.length >= ACCOUNT_MAX) { acc.lockedUntil = now + ACCOUNT_LOCK_MIN * 60000; acc.hits = []; }
    await guard().setJSON("account", acc);
  } catch (e) { console.error("login guard write failed", e); }
}
export async function clearFails(ip) { try { await guard().delete(ipKey(ip)); } catch (e) { console.error(e); } }

// Simple fixed-window rate limit for public endpoints (per address). Returns true if allowed.
export async function rateLimit(name, ip, max, windowMin) {
  try {
    const s = store("sc-rate");
    const k = name + "-" + ipKey(ip);
    const now = Date.now();
    const rec = (await s.get(k, { type: "json" })) || { start: now, n: 0 };
    if (now - rec.start > windowMin * 60000) { rec.start = now; rec.n = 0; }
    rec.n += 1;
    await s.setJSON(k, rec);
    return rec.n <= max;
  } catch (e) { console.error("rate limit failed", e); return true; }
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
