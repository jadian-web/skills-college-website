// Public team API: published profiles in display order
//   GET /api/team
import { teamStore } from "./lib/stores.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
});

export default async () => {
  try {
    const store = teamStore();
    const { blobs } = await store.list();
    const team = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }))))
      .filter((p) => p && p.status === "published")
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.name).localeCompare(String(b.name)))
      .map(({ id, name, role, department, bio, photo, linkedin, email }) => ({ id, name, role, department, bio, photo, linkedin, email }));
    return out(team);
  } catch (e) {
    console.error(e);
    return out({ error: "Server error" }, 500);
  }
};

export const config = { path: "/api/team" };
