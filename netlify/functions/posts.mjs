// Public blog API (published posts only)
//   GET /api/posts            -> list (no body)
//   GET /api/posts/<slug>     -> one post
import { postsStore } from "./lib/stores.mjs";

const out = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
});

export default async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.replace(/^\/api\/posts\/?/, "").replace(/\/$/, "");
  const store = postsStore();
  if (slug) {
    const post = await store.get(slug, { type: "json" });
    if (!post || post.status !== "published") return out({ error: "Not found" }, 404);
    return out(post);
  }
  const { blobs } = await store.list();
  const posts = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }))))
    .filter((p) => p && p.status === "published")
    .map(({ body, takeaways, sources, ...rest }) => rest)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return out(posts);
};

export const config = { path: ["/api/posts", "/api/posts/*"] };
