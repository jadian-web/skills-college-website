// Public events API (published events only)
//   GET /api/events          -> list (no body / gallery list trimmed)
//   GET /api/events/<slug>   -> one event
import { eventsStore } from "./lib/stores.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
});

async function handle(req) {
  const slug = new URL(req.url).pathname.replace(/^\/api\/events\/?/, "").replace(/\/$/, "");
  const store = eventsStore();
  if (slug) {
    const ev = await store.get(slug, { type: "json" });
    if (!ev || ev.status !== "published") return out({ error: "Not found" }, 404);
    return out(ev);
  }
  const { blobs } = await store.list();
  const list = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }))))
    .filter((e) => e && e.status === "published")
    .map(({ body, ...rest }) => ({ ...rest, gallery: (rest.gallery || []).slice(0, 1).length ? rest.gallery : [] }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return out(list);
}

export default async (req) => {
  try { return await handle(req); }
  catch (e) { console.error(e); return out({ error: "Server error: " + ((e && e.message) || e) }, 500); }
};

export const config = { path: ["/api/events", "/api/events/*"] };
