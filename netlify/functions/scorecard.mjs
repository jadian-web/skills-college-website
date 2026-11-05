// Public endpoint: stores a B-BBEE scorecard calculator result so the team can see it in the portal.
//   POST /api/scorecard   (JSON)  -> { ok: true, ref }
// The same result is also sent through Netlify Forms (form "scorecard"), which emails sales@skillscollege.co.za.
import { scorecardStore } from "./lib/stores.mjs";
import { rateLimit } from "./lib/auth.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const t = (v, max = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const n = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : null; };

export default async (req) => {
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 20000) return out({ error: "Too large" }, 413);
    let d; try { d = JSON.parse(raw); } catch { return out({ error: "Bad request" }, 400); }
    // spam protection: hidden honeypot field, minimum time on the form, and max 8 results per hour per address
    if (d.botField || (typeof d.elapsed === "number" && d.elapsed < 4000)) return out({ ok: true, ref: "SC-RECEIVED" });
    const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
    if (!(await rateLimit("scorecard", ip, 8, 60))) return out({ error: "Too many submissions from this connection. Please try again in an hour or email sales@skillscollege.co.za." }, 429);
    if (!t(d.company) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t(d.email)) || d.consent !== true) return out({ error: "Company, a valid email and consent are required." }, 400);
    const ref = "SC-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const rec = {
      ref, createdAt: new Date().toISOString(),
      company: t(d.company), contact: t(d.contact), email: t(d.email), phone: t(d.phone, 40), role: t(d.role),
      sector: t(d.sector), seta: t(d.seta), turnover: n(d.turnover), category: t(d.category, 40), scorecard: t(d.scorecard, 60),
      level: t(d.level, 40), recognition: t(d.recognition, 20), points: n(d.points), discounted: !!d.discounted,
      elements: (Array.isArray(d.elements) ? d.elements : []).slice(0, 8).map((e) => ({ name: t(e.name, 80), points: n(e.points), max: n(e.max), bonus: n(e.bonus), subMin: t(e.subMin, 20) })),
      notes: (Array.isArray(d.notes) ? d.notes : []).slice(0, 12).map((x) => t(x, 300)),
      inputs: Object.fromEntries(Object.entries(d.inputs && typeof d.inputs === "object" ? d.inputs : {}).slice(0, 80).map(([k, v]) => [t(k, 40), typeof v === "number" ? v : t(v, 120)])),
      status: "new",
    };
    await scorecardStore().setJSON(rec.createdAt.replace(/[:.]/g, "-") + "-" + ref, rec);
    return out({ ok: true, ref });
  } catch (e) {
    console.error(e);
    return out({ error: "Server error" }, 500);
  }
};

export const config = { path: "/api/scorecard" };
