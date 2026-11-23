// Applies text edited in the management portal (Content tab) to each page as it is served.
// Pages are static HTML; every editable element carries data-c="key". If nothing was edited for a page,
// the original page is returned untouched. If anything goes wrong, Netlify serves the original page (onError: "bypass").
import { getStore } from "@netlify/blobs";

let cache = { at: 0, data: null };
async function overrides() {
  if (cache.data && Date.now() - cache.at < 15000) return cache.data;
  const data = (await getStore("sc-content").get("pages", { type: "json" })) || {};
  cache = { at: Date.now(), data };
  return data;
}

const ARROW = ' <span class="arrow" aria-hidden="true">&rarr;</span>';
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function applyContent(html, page) {
  for (const [key, value] of Object.entries(page.fields || {})) {
    const safeKey = key.replace(/[^a-z0-9-]/gi, "");
    const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\sdata-c="${safeKey}"[^>]*>)([\\s\\S]*?)(</\\2>)`, "i");
    html = html.replace(re, (all, open, tag, inner, close) => {
      const arrow = /<span class="arrow" aria-hidden="true">[\s\S]*?<\/span>\s*$/.test(inner);
      return open + value + (arrow ? ARROW : "") + close;
    });
  }
  if (page.title) {
    const t = escText(page.title), a = escAttr(page.title);
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/i, `$1${a}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/i, `$1${a}$2`);
  }
  if (page.description) {
    const d = escAttr(page.description);
    html = html.replace(/(<meta name="description" content=")[^"]*(")/i, `$1${d}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/i, `$1${d}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/i, `$1${d}$2`);
  }
  return html;
}

// Detail pages are one HTML template filled in by JavaScript. So that search engines and link previews see the
// right title and description at first load, the record is looked up here and the head tags are filled in.
const DETAIL = {
  "/resources/article/": { param: "slug", store: "sc-posts", desc: (r) => r.summary },
  "/about/events/": { param: "event", store: "sc-events", desc: (r) => r.summary },
  "/learners/opportunities/": { param: "id", store: "sc-opportunities", desc: (r) => r.summary },
};
const PRODUCTION_HOSTS = new Set(["skillscollege.co.za", "www.skillscollege.co.za"]);
const SITE = "https://skillscollege.co.za";

async function detailMeta(url) {
  const d = DETAIL[url.pathname];
  if (!d) return null;
  const id = url.searchParams.get(d.param) || "";
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return null;
  const rec = await getStore(d.store).get(id, { type: "json" });
  if (!rec || rec.status !== "published" || !rec.title) return null;
  return {
    title: String(rec.title).slice(0, 160) + " | Skills College",
    description: String(d.desc(rec) || "").replace(/\s+/g, " ").trim().slice(0, 300),
    url: SITE + url.pathname + "?" + d.param + "=" + id,
    image: /^\/media\/[a-z0-9._\/-]+$/i.test(rec.cover || "") ? SITE + rec.cover : "",
  };
}

export function applyDetail(html, m) {
  html = applyContent(html, { title: m.title, description: m.description || undefined });
  const u = escAttr(m.url);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/i, `$1${u}$2`);
  if (/<link rel="canonical"/i.test(html)) html = html.replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${u}$2`);
  else html = html.replace(/<\/title>/i, `</title>\n<link rel="canonical" href="${u}">`);
  if (m.image) html = html.replace(/(<meta property="og:image" content=")[^"]*(")/i, `$1${escAttr(m.image)}$2`);
  return html.replace(/(<meta property="og:type" content=")[^"]*(")/i, `$1article$2`);
}

export default async (request, context) => {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const url = new URL(request.url);
  // Staging, branch and preview deploys must never be indexed
  const staging = !PRODUCTION_HOSTS.has(url.hostname);
  let path = url.pathname;
  if (response.status === 404) path = "/404.html";
  else if (!path.endsWith("/") && !path.endsWith(".html")) path += "/";
  path = path.replace(/index\.html$/, "");
  let page = null, detail = null;
  try { page = (await overrides())[path] || null; } catch (e) { console.error("content overrides unavailable", e); }
  if (response.status === 200) { try { detail = await detailMeta(url); } catch (e) { console.error("detail meta unavailable", e); } }
  if (!page && !detail && !staging) return response;
  let html = await response.text();
  if (page) html = applyContent(html, page);
  if (detail) html = applyDetail(html, detail);
  const headers = new Headers(response.headers);
  if (staging) {
    headers.set("x-robots-tag", "noindex, nofollow");
    html = html.replace(/<meta name="robots" content="[^"]*">\n?/i, "").replace(/<head>/i, '<head>\n<meta name="robots" content="noindex, nofollow">');
  }
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(html, { status: response.status, headers });
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/media/*", "/assets/*", "/sc-console-67acf1609f/*", "/sitemap.xml", "/robots.txt", "/favicon.ico", "/site.webmanifest", "/.netlify/*"],
  onError: "bypass",
};
