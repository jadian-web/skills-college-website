// Management portal API: /api/admin/*
// Every route except /login requires a valid signed session cookie.
// State-changing requests also require the X-SC-Admin header (blocks cross-site form posts).
import sanitizeHtml from "sanitize-html";
import manifest from "./lib/media-manifest.json" with { type: "json" };
import {
  verifyPassword, createSessionCookie, clearSessionCookie, readSession,
  isLocked, recordFail, clearFails, json,
} from "./lib/auth.mjs";
import { mediaStore, postsStore, stateStore, IMAGE_TYPES, MAX_BYTES, sniffImage, slugify } from "./lib/stores.mjs";

const CATEGORIES = ["QCTO", "B-BBEE Skills Development", "Learnerships & Internships", "Bursaries", "Funding & Grants",
  "Workplace Learning", "Compliance Updates", "Learner Guidance", "Company News"];

const clean = (html) => sanitizeHtml(String(html || ""), {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "blockquote", "img", "figure", "figcaption", "hr"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: [] },
  allowProtocolRelative: false,
  exclusiveFilter: (frame) => frame.tag === "img" && !/^\/media\//.test(frame.attribs.src || ""),
  transformTags: { a: (tag, attribs) => ({ tagName: "a", attribs: { href: attribs.href, ...(/^https?:/.test(attribs.href || "") ? { target: "_blank", rel: "noopener" } : {}) } }) },
});
const text = (v, max = 400) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

async function getState() { return (await stateStore().get("media-state", { type: "json" })) || { hidden: [] }; }
async function setState(s) { await stateStore().setJSON("media-state", s); }

export default async (req, context) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");
  const method = req.method.toUpperCase();
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";

  // ---------------- login / logout / session ----------------
  if (route === "login" && method === "POST") {
    const until = await isLocked(ip);
    if (until) return json({ error: `Too many attempts. Try again after ${new Date(until).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg" })}.` }, 429);
    let body = {};
    try { body = await req.json(); } catch {}
    if (!verifyPassword(body.username, body.password)) {
      await recordFail(ip);
      return json({ error: "Incorrect username or password." }, 401);
    }
    await clearFails(ip);
    return json({ ok: true }, 200, { "set-cookie": createSessionCookie() });
  }

  const session = readSession(req);
  if (!session) return json({ error: "Not signed in." }, 401);
  if (method !== "GET" && req.headers.get("x-sc-admin") !== "1") return json({ error: "Bad request." }, 400);

  if (route === "logout" && method === "POST") return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  if (route === "session") return json({ user: session.u, expires: session.exp });

  // ---------------- images ----------------
  if (route === "media" && method === "GET") {
    const store = mediaStore();
    const { blobs } = await store.list();
    const state = await getState();
    const meta = {};
    await Promise.all(blobs.map(async (b) => { const m = await store.getMetadata(b.key); meta[b.key] = m?.metadata || {}; }));
    const slots = manifest.map((s) => ({
      ...s,
      replaced: !!meta["slot/" + s.name],
      hidden: (state.hidden || []).includes(s.name),
      updatedAt: meta["slot/" + s.name]?.uploadedAt || null,
    }));
    const uploads = blobs.filter((b) => b.key.startsWith("uploads/")).map((b) => ({
      name: b.key, url: "/media/" + b.key, ...meta[b.key],
    })).sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
    return json({ slots, uploads });
  }

  if (route === "media" && method === "POST") {
    let form;
    try { form = await req.formData(); } catch { return json({ error: "Upload could not be read." }, 400); }
    const file = form.get("file");
    const slot = text(form.get("slot") || "", 120);
    if (!file || typeof file === "string") return json({ error: "Choose an image to upload." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Image is larger than 4.5 MB. Resize it and try again." }, 413);
    const buf = await file.arrayBuffer();
    const type = sniffImage(buf);
    if (!type) return json({ error: "Only JPG, PNG, WebP or GIF images are allowed." }, 415);
    const metadata = { contentType: type, size: buf.byteLength, uploadedAt: new Date().toISOString(), originalName: text(file.name, 120) };
    if (slot) {
      if (!manifest.some((s) => s.name === slot)) return json({ error: "Unknown site image." }, 400);
      await mediaStore().set("slot/" + slot, buf, { metadata });
      const st = await getState(); st.hidden = (st.hidden || []).filter((n) => n !== slot); await setState(st);
      return json({ ok: true, name: slot, url: "/media/" + slot + "?v=" + Date.now() });
    }
    const base = slugify(String(file.name || "image").replace(/\.[a-z0-9]+$/i, "")) || "image";
    const key = `uploads/${Date.now().toString(36)}-${base}.${IMAGE_TYPES[type]}`;
    await mediaStore().set(key, buf, { metadata });
    return json({ ok: true, name: key, url: "/media/" + key });
  }

  if (route === "media/restore" && method === "POST") {
    const { name } = await req.json().catch(() => ({}));
    if (!manifest.some((s) => s.name === name)) return json({ error: "Unknown site image." }, 400);
    await mediaStore().delete("slot/" + name);
    const st = await getState(); st.hidden = (st.hidden || []).filter((n) => n !== name); await setState(st);
    return json({ ok: true });
  }

  if (route === "media/hide" && method === "POST") {
    const { name } = await req.json().catch(() => ({}));
    if (!manifest.some((s) => s.name === name)) return json({ error: "Unknown site image." }, 400);
    const st = await getState(); st.hidden = Array.from(new Set([...(st.hidden || []), name])); await setState(st);
    return json({ ok: true });
  }

  if (route === "media" && method === "DELETE") {
    const name = url.searchParams.get("name") || "";
    if (!/^uploads\/[a-z0-9._-]+$/i.test(name)) return json({ error: "Only library uploads can be deleted. Use Restore for site images." }, 400);
    await mediaStore().delete(name);
    return json({ ok: true });
  }

  // ---------------- blog posts ----------------
  if (route === "posts" && method === "GET") {
    const store = postsStore();
    const { blobs } = await store.list();
    const posts = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return json({ posts, categories: CATEGORIES });
  }

  if (route === "posts" && method === "POST") {
    const p = await req.json().catch(() => null);
    if (!p || !text(p.title)) return json({ error: "A headline is required." }, 400);
    const store = postsStore();
    const slug = slugify(p.slug || p.title);
    if (!slug) return json({ error: "Headline needs letters or numbers." }, 400);
    const previous = p.originalSlug ? slugify(p.originalSlug) : "";
    if (slug !== previous && (await store.get(slug))) return json({ error: "Another post already uses this web address. Change the headline or address." }, 409);
    const existing = previous ? await store.get(previous, { type: "json" }) : null;
    const post = {
      slug,
      title: text(p.title, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : new Date().toISOString().slice(0, 10),
      category: CATEGORIES.includes(p.category) ? p.category : CATEGORIES[0],
      summary: text(p.summary, 600),
      cover: /^\/media\/[a-z0-9._\/-]+$/i.test(p.cover || "") ? p.cover : "",
      coverAlt: text(p.coverAlt, 200),
      body: clean(p.body),
      takeaways: (Array.isArray(p.takeaways) ? p.takeaways : []).map((t) => text(t, 300)).filter(Boolean).slice(0, 10),
      related: (Array.isArray(p.related) ? p.related : []).filter((r) => /^\/[a-z0-9\/-]*$/.test(r)).slice(0, 6),
      sources: (Array.isArray(p.sources) ? p.sources : []).map((s) => ({ label: text(s.label, 200), url: /^https?:\/\//.test(s.url || "") ? String(s.url).slice(0, 500) : "" }))
        .filter((s) => s.label && s.url).slice(0, 10),
      audience: ["employers", "learners", "both"].includes(p.audience) ? p.audience : "employers",
      status: p.status === "published" ? "published" : "draft",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON(slug, post);
    if (previous && previous !== slug) await store.delete(previous);
    return json({ ok: true, post });
  }

  if (route.startsWith("posts/") && method === "DELETE") {
    await postsStore().delete(slugify(route.slice(6)));
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
};

export const config = { path: "/api/admin/*" };
