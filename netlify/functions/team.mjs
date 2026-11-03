// Public team API
//   GET /api/team          -> published profiles in display order
//   GET /api/team/groups   -> published group photos (facilitators, project owners...)
import { teamStore, groupStore } from "./lib/stores.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
});
const all = async (store) => {
  const { blobs } = await store.list();
  return (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter((x) => x && x.status === "published");
};

export default async (req) => {
  try {
    if (new URL(req.url).pathname.replace(/\/$/, "").endsWith("/groups")) {
      const groups = (await all(groupStore())).sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map(({ id, title, caption, photo, alt }) => ({ id, title, caption, photo, alt }));
      return out(groups);
    }
    const team = (await all(teamStore()))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.name).localeCompare(String(b.name)))
      .map(({ id, name, role, department, bio, photo, linkedin, email, featured }) => ({ id, name, role, department, bio, photo, linkedin, email, featured: !!featured }));
    return out(team);
  } catch (e) {
    console.error(e);
    return out({ error: "Server error" }, 500);
  }
};

export const config = { path: ["/api/team", "/api/team/groups"] };
