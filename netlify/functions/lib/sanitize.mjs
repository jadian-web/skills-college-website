// Small, dependency-free HTML cleaner for blog posts.
// Only the tags and attributes below survive; everything else is removed.
const ALLOWED = new Set(["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "blockquote", "img", "figure", "figcaption", "hr"]);
const VOID = new Set(["br", "hr", "img"]);
// Removed together with everything inside them
const DROP_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "select", "title", "head"]);
// Map browser editor tags to their allowed equivalents
const RENAME = { div: "p" };

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d) || 32))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = (s) => String(s).replace(/&(?![a-z]+;|#\d+;|#x[0-9a-f]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function safeHref(v) {
  const clean = decodeEntities(v).replace(/[\u0000- \u007f-\u009f]/g, "");
  if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean;
  if (/^\/(?!\/)/.test(clean) || /^#/.test(clean)) return clean;
  return null;
}
function safeImg(v) {
  const clean = decodeEntities(v).trim();
  return /^\/media\/[a-z0-9._\/-]+(\?v=\d+)?$/i.test(clean) && !clean.includes("..") ? clean : null;
}

function parseAttrs(str) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(str))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

export function sanitize(html) {
  const input = String(html || "").replace(/<!--[\s\S]*?-->/g, "").slice(0, 200000);
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  const out = [];
  const stack = [];
  let last = 0, dropping = null, m;

  while ((m = tagRe.exec(input))) {
    const text = input.slice(last, m.index);
    last = tagRe.lastIndex;
    if (!dropping && text) out.push(escText(text));

    const closing = m[1] === "/";
    let tag = m[2].toLowerCase();

    if (dropping) { if (closing && tag === dropping) dropping = null; continue; }
    if (DROP_CONTENT.has(tag)) { if (!closing && !/\/\s*$/.test(m[3])) dropping = tag; continue; }
    tag = RENAME[tag] || tag;
    if (!ALLOWED.has(tag)) continue;

    if (closing) {
      const idx = stack.lastIndexOf(tag);
      if (idx === -1) continue;
      while (stack.length > idx) out.push(`</${stack.pop()}>`);
      continue;
    }

    const attrs = parseAttrs(m[3] || "");
    let attrStr = "";
    if (tag === "a") {
      const href = attrs.href != null ? safeHref(attrs.href) : null;
      if (href) {
        attrStr = ` href="${escAttr(href)}"`;
        if (/^https?:/i.test(href)) attrStr += ' target="_blank" rel="noopener"';
      }
    } else if (tag === "img") {
      const src = attrs.src != null ? safeImg(attrs.src) : null;
      if (!src) continue; // images must come from the site's own image library
      attrStr = ` src="${escAttr(src)}" alt="${escAttr(decodeEntities(attrs.alt || ""))}"`;
    }
    if (VOID.has(tag)) { out.push(`<${tag}${attrStr}>`); continue; }
    out.push(`<${tag}${attrStr}>`);
    stack.push(tag);
  }
  if (!dropping) out.push(escText(input.slice(last)));
  while (stack.length) out.push(`</${stack.pop()}>`);
  return out.join("");
}
