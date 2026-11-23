// Portal-managed lists that power public pages:
//   opportunities  -> /learners/opportunities/   (learnerships, internships, bursaries, training)
//   qualifications -> /qcto/qualifications/      (searchable qualification directory)
//   documents      -> /about/accreditations-quality/ and /paia-manual/ (certificates and downloads)
//   testimonials   -> home page client testimonials
//   partners       -> home page partner badges carousel
// Each record is cleaned here before it is saved, so only expected fields and safe values are stored.
import { store } from "./stores.mjs";
import { sanitize } from "./sanitize.mjs";

const text = (v, max = 300) => String(v ?? "").replace(/[<>]/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const lines = (v, maxItems = 20, max = 300) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => text(x, max)).filter(Boolean).slice(0, maxItems);
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
const mediaUrl = (u) => (/^\/media\/[a-z0-9._\/-]+$/i.test(u || "") && !String(u).includes("..") ? u : "");
const docUrl = (u) => (/^\/media\/docs\/[a-z0-9._-]+\.pdf$/i.test(u || "") ? u : "");
function safeLink(u) {
  const s = String(u || "").trim();
  if (/^https:\/\/[^\s<>"']+$/i.test(s) && s.length < 500) return s;
  if (/^\/(?![\/\\])[^\s<>"'\\]*$/.test(s) && s.length < 300) return s;
  return "";
}
const email = (v) => (/^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/.test(v || "") ? text(v, 160) : "");

export const OPP_TYPES = ["Learnership", "Internship", "Bursary", "Skills programme", "Apprenticeship", "Other"];
export const QUAL_TYPES = ["Occupational qualification", "Part qualification", "Skills programme", "Legacy qualification"];
export const QUAL_AVAIL = ["Available", "On request", "Teach-out", "Not currently offered"];
export const DOC_CATS = ["B-BBEE certificate", "QCTO accreditation", "SETA accreditation", "DHET registration", "Quality and policies", "PAIA manual", "Other"];

export const COLLECTIONS = {
  opportunities: {
    store: "sc-opportunities",
    sort: (a, b) => String(a.closingDate || "9999").localeCompare(String(b.closingDate || "9999")) || (a.order ?? 999) - (b.order ?? 999),
    clean: (p) => ({
      title: text(p.title, 160), type: oneOf(p.type, OPP_TYPES, "Other"), location: text(p.location, 160),
      openDate: date(p.openDate), closingDate: date(p.closingDate), startDate: date(p.startDate),
      duration: text(p.duration, 80), stipend: text(p.stipend, 160), summary: text(p.summary, 500),
      description: sanitize(p.description || ""), eligibility: lines(p.eligibility), documents: lines(p.documents), selection: lines(p.selection),
      applyUrl: safeLink(p.applyUrl), applyEmail: email(p.applyEmail), contact: text(p.contact, 200),
    }),
    required: (r) => (r.title ? "" : "A title is required."),
  },
  qualifications: {
    store: "sc-qualifications",
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title)),
    clean: (p) => ({
      title: text(p.title, 200), qualId: text(p.qualId, 40), nqf: text(p.nqf, 10), credits: text(p.credits, 10),
      type: oneOf(p.type, QUAL_TYPES, QUAL_TYPES[0]), sector: text(p.sector, 120), entry: text(p.entry, 400), duration: text(p.duration, 80),
      delivery: text(p.delivery, 200), mode: text(p.mode, 120), availability: oneOf(p.availability, QUAL_AVAIL, "Available"),
      scope: text(p.scope, 300), summary: text(p.summary, 600), seta: text(p.seta, 80),
    }),
    required: (r) => (r.title ? "" : "A qualification name is required."),
  },
  documents: {
    store: "sc-documents",
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title)),
    clean: (p) => ({
      title: text(p.title, 200), category: oneOf(p.category, DOC_CATS, "Other"), issuer: text(p.issuer, 160), scope: text(p.scope, 400),
      issued: date(p.issued), expires: date(p.expires), file: docUrl(p.file), size: Number.isFinite(+p.size) ? Math.max(0, Math.min(10e6, Math.round(+p.size))) : 0,
      note: text(p.note, 300),
    }),
    required: (r) => (!r.title ? "A document title is required." : !r.file ? "Upload the PDF file first." : ""),
  },
};

COLLECTIONS.testimonials = {
  store: "sc-testimonials",
  sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
  clean: (p) => ({
    quote: text(p.quote, 600), name: text(p.name, 120), role: text(p.role, 120), company: text(p.company, 160),
    photo: mediaUrl(p.photo), consent: p.consent === true || p.consent === "true",
  }),
  required: (r) => (!r.quote ? "The testimonial text is required." : !r.name && !r.company ? "Add the person's name or the company." : !r.consent ? "Confirm that the client approved this testimonial for the website." : ""),
};
COLLECTIONS.partners = {
  store: "sc-partners",
  sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
  clean: (p) => ({ title: text(p.title, 160), logo: mediaUrl(p.logo), url: /^https:\/\/[^\s<>"']+$/i.test(p.url || "") ? String(p.url).slice(0, 400) : "", note: text(p.note, 160) }),
  required: (r) => (!r.title ? "The partner name is required." : !r.logo ? "Choose a logo image." : ""),
};

export const colStore = (name) => store(COLLECTIONS[name].store);

export async function listCollection(name, { publishedOnly = false } = {}) {
  const s = colStore(name);
  const { blobs } = await s.list();
  const items = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean);
  return items.filter((x) => !publishedOnly || x.status === "published").sort(COLLECTIONS[name].sort);
}
export { text as cleanText, mediaUrl };
