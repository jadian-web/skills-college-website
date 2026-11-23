// Public lists managed in the portal (published records only)
//   GET /api/opportunities         GET /api/opportunities/<id>
//   GET /api/qualifications        GET /api/documents
//   GET /api/testimonials          GET /api/partners
import { listCollection, colStore } from "./lib/collections.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
});
const strip = ({ order, createdAt, ...r }) => r;

export default async (req) => {
  if (req.method !== "GET") return out({ error: "Method not allowed" }, 405);
  try {
    const parts = new URL(req.url).pathname.replace(/\/$/, "").split("/").slice(2); // ["opportunities", id?]
    const [name, id] = parts;
    if (!["opportunities", "qualifications", "documents", "testimonials", "partners"].includes(name)) return out({ error: "Not found" }, 404);
    if (id) {
      if (name !== "opportunities" || !/^[a-z0-9-]{1,80}$/.test(id)) return out({ error: "Not found" }, 404);
      const r = await colStore(name).get(id, { type: "json" });
      if (!r || r.status !== "published") return out({ error: "Not found" }, 404);
      return out(strip(r));
    }
    const items = (await listCollection(name, { publishedOnly: true })).map(strip);
    if (name === "opportunities") {
      // hide opportunities that closed more than 30 days ago
      const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      return out(items.filter((o) => !o.closingDate || o.closingDate >= cutoff).map(({ description, ...o }) => o));
    }
    if (name === "testimonials") return out(items.map(({ consent, ...t }) => t));
    return out(items);
  } catch (e) {
    console.error(e);
    return out({ error: "Server error" }, 500);
  }
};

export const config = { path: ["/api/opportunities", "/api/opportunities/*", "/api/qualifications", "/api/documents", "/api/testimonials", "/api/partners"] };
