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

export default async (request, context) => {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let path = new URL(request.url).pathname;
  if (response.status === 404) path = "/404.html";
  else if (!path.endsWith("/") && !path.endsWith(".html")) path += "/";
  path = path.replace(/index\.html$/, "");
  let page;
  try { page = (await overrides())[path]; } catch (e) { console.error("content overrides unavailable", e); return response; }
  if (!page) return response;
  const html = applyContent(await response.text(), page);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(html, { status: response.status, headers });
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/media/*", "/assets/*", "/sc-console-67acf1609f/*", "/sitemap.xml", "/robots.txt", "/favicon.ico", "/site.webmanifest", "/.netlify/*"],
  onError: "bypass",
};
