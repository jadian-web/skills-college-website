import { getStore } from "@netlify/blobs";

// Use strong consistency only when the environment supports it (avoids a crash if it does not)
function blobsContext() {
  try {
    if (globalThis.netlifyBlobsContext) return JSON.parse(Buffer.from(globalThis.netlifyBlobsContext, "base64").toString());
    if (process.env.NETLIFY_BLOBS_CONTEXT) return JSON.parse(Buffer.from(process.env.NETLIFY_BLOBS_CONTEXT, "base64").toString());
  } catch {}
  return null;
}
export function store(name) {
  const ctx = blobsContext();
  return ctx && ctx.uncachedEdgeURL ? getStore({ name, consistency: "strong" }) : getStore(name);
}
export const mediaStore = () => store("sc-media");
export const postsStore = () => store("sc-posts");
export const stateStore = () => store("sc-state");

export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_BYTES = 4.5 * 1024 * 1024; // Netlify function request limit is 6 MB

// Check the real file signature, not only the declared type
export function sniffImage(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
