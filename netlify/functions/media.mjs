// Public image endpoint: /media/<name>
// Serves the portal's replacement image when one exists, otherwise the original file.
import { mediaStore, stateStore } from "./lib/stores.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const name = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
  if (!name || name.includes("..") || !/^[a-z0-9][a-z0-9._\/-]*$/i.test(name)) return new Response("Not found", { status: 404 });

  const store = mediaStore();
  const isUpload = name.startsWith("uploads/");

  if (!isUpload) {
    const state = (await stateStore().get("media-state", { type: "json" })) || { hidden: [] };
    if ((state.hidden || []).includes(name)) return new Response("Removed", { status: 404, headers: { "cache-control": "public, max-age=60" } });
  }

  const key = isUpload ? name : "slot/" + name;
  const hit = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (hit && hit.data) {
    return new Response(hit.data, {
      headers: {
        "content-type": hit.metadata?.contentType || "application/octet-stream",
        "cache-control": "public, max-age=120",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (isUpload) return new Response("Not found", { status: 404 });
  // Fall back to the original image shipped with the site
  return new Response(null, { status: 302, headers: { location: "/assets/img/" + name, "cache-control": "public, max-age=60" } });
};

export const config = { path: "/media/*" };
