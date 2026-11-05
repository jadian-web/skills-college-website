// /sitemap.xml: every public page plus published blog posts and events (read live from the portal's data)
import pages, { SITE, BUILT } from "./lib/static-pages.mjs";
import { postsStore, eventsStore } from "./lib/stores.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
async function published(store) {
  try {
    const { blobs } = await store.list();
    return (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter((x) => x && x.status === "published");
  } catch (e) { console.error(e); return []; }
}

export default async () => {
  const [posts, events] = await Promise.all([published(postsStore()), published(eventsStore())]);
  const urls = pages.map((p) => ({ loc: p.loc, lastmod: BUILT, priority: p.priority }))
    .concat(posts.map((p) => ({ loc: `${SITE}/resources/article/?slug=${encodeURIComponent(p.slug)}`, lastmod: String(p.updatedAt || p.date).slice(0, 10), priority: "0.6" })))
    .concat(events.map((e) => ({ loc: `${SITE}/about/events/?event=${encodeURIComponent(e.slug)}`, lastmod: String(e.updatedAt || e.date).slice(0, 10), priority: "0.4" })));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${esc(u.lastmod)}</lastmod><priority>${u.priority}</priority></url>`).join("\n") + "\n</urlset>\n";
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};

export const config = { path: "/sitemap.xml" };
