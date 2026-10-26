// Authentication helpers for the Skills College management portal.
// The password is never stored in plain text: only a salted scrypt hash.
// Override any default with Netlify environment variables (recommended):
//   ADMIN_USERNAME, ADMIN_PASSWORD_HASH (scrypt$<salt>$<hash>), SESSION_SECRET
import crypto from "node:crypto";
import { store } from "./stores.mjs";

const DEFAULT_USER = "jadian";
const DEFAULT_HASH =
  "scrypt$e21e6294fb8e9a4b9744624125b3c5cf$2694596803231e34a74599454062bf88d8f039803e9c043a490c3fc44f3e51399a8bebd5c78c258cf31c5e3d0f31ab3920c00b2fb0a4928455ea96a5dad3f48f";
const DEFAULT_SECRET = "d0b27bc8a41143174993a8cbeed1b3022d5fd6128cf90fc2203fd34268e4ebf9";

const env = (k) => (typeof Netlify !== "undefined" && Netlify.env?.get(k)) || process.env[k] || "";
const USERNAME = () => env("ADMIN_USERNAME") || DEFAULT_USER;
const PASS_HASH = () => env("ADMIN_PASSWORD_HASH") || DEFAULT_HASH;
const SECRET = () => env("SESSION_SECRET") || DEFAULT_SECRET;

export const COOKIE = "__Host-sc_session";
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function verifyPassword(user, password) {
  const [, salt, hash] = PASS_HASH().split("$");
  const calc = crypto.scryptSync(String(password || ""), salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  // Always compute the hash so timing does not reveal whether the username was right
  const passOk = safeEqual(calc, hash);
  const userOk = safeEqual(String(user || "").trim().toLowerCase(), USERNAME().toLowerCase());
  return passOk && userOk;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function createSessionCookie() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const token = sign({ u: USERNAME(), exp, n: crypto.randomBytes(8).toString("hex") });
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readSession(req) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!m) return null;
  const token = m.slice(COOKIE.length + 1);
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expect = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  if (!safeEqual(mac, expect)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

// ---- brute-force protection (per IP, stored in Netlify Blobs) ----
const guard = () => store("sc-login-guard");
const ipKey = (ip) => "ip-" + crypto.createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 32);

// If storage is unavailable, sign-in still works (the error is logged) rather than failing completely
export async function isLocked(ip) {
  try {
    const rec = await guard().get(ipKey(ip), { type: "json" });
    return rec && rec.lockedUntil && rec.lockedUntil > Date.now() ? rec.lockedUntil : 0;
  } catch (e) { console.error("login guard read failed", e); return 0; }
}
export async function recordFail(ip) {
  try {
    const k = ipKey(ip);
    const rec = (await guard().get(k, { type: "json" })) || { fails: 0 };
    rec.fails = (rec.fails || 0) + 1;
    if (rec.fails >= MAX_FAILS) { rec.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000; rec.fails = 0; }
    await guard().setJSON(k, rec);
  } catch (e) { console.error("login guard write failed", e); }
}
export async function clearFails(ip) { try { await guard().delete(ipKey(ip)); } catch (e) { console.error(e); } }

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
