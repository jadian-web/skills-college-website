/* Skills College management portal: Opportunities, Qualifications and Documents.
   One schema-driven editor for the three lists that power public pages. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var P, esc, api, toast, options = {};

  var SCHEMAS = {
    opportunities: {
      title: "Learner opportunities", noun: "opportunity",
      intro: "Learnerships, internships, bursaries and training intakes shown on For Learners > Current opportunities. Opportunities disappear from the site 30 days after their closing date.",
      view: function (r) { return "/learners/opportunities/?id=" + encodeURIComponent(r.id); },
      cols: [["Opportunity", "title"], ["Type", "type"], ["Location", "location"], ["Closes", "closingDate"]],
      fields: [
        ["title", "Title", "text", { req: 1, max: 160, full: 1, ph: "e.g. Business Administration Learnership (NQF 4)" }],
        ["type", "Type", "select", { opts: "OPP_TYPES" }], ["location", "Location", "text", { max: 160, ph: "e.g. Pretoria, Gauteng" }],
        ["openDate", "Opens", "date"], ["closingDate", "Closing date", "date"], ["startDate", "Start date", "date"],
        ["duration", "Duration", "text", { max: 80, ph: "e.g. 12 months" }], ["stipend", "Stipend", "text", { max: 160, ph: "e.g. R4 500 per month" }],
        ["summary", "Short summary", "textarea", { max: 500, full: 1, rows: 3, hint: "Shown on the opportunity card" }],
        ["description", "Full description", "textarea", { full: 1, rows: 6, hint: "Plain text. Blank lines start new paragraphs." }],
        ["eligibility", "Who can apply", "lines", { full: 1, hint: "One requirement per line" }],
        ["documents", "Documents needed", "lines", { full: 1, hint: "One document per line" }],
        ["selection", "Selection steps", "lines", { full: 1, hint: "One step per line, in order" }],
        ["applyUrl", "Apply link", "text", { max: 500, ph: "https://... (leave blank to apply by email)" }],
        ["applyEmail", "Apply by email", "text", { max: 160, ph: "recruitment@skillscollege.co.za" }],
        ["contact", "Enquiries", "text", { max: 200, full: 1, ph: "e.g. 082 487 5996" }]
      ]
    },
    qualifications: {
      title: "QCTO qualifications", noun: "qualification",
      intro: "The searchable directory on QCTO > Qualifications. Only list what Skills College is accredited for, and keep availability current.",
      view: function () { return "/qcto/qualifications/#directory"; },
      cols: [["Qualification", "title"], ["ID", "qualId"], ["NQF", "nqf"], ["Availability", "availability"]],
      fields: [
        ["title", "Qualification name", "text", { req: 1, max: 200, full: 1 }],
        ["qualId", "SAQA / QCTO ID", "text", { max: 40 }], ["type", "Type", "select", { opts: "QUAL_TYPES" }],
        ["nqf", "NQF level", "text", { max: 10, ph: "e.g. 4" }], ["credits", "Credits", "text", { max: 10 }],
        ["sector", "Sector / occupation", "text", { max: 120 }], ["seta", "SETA / quality partner", "text", { max: 80 }],
        ["duration", "Duration", "text", { max: 80 }], ["mode", "Mode", "text", { max: 120, ph: "e.g. Learnership, skills programme" }],
        ["availability", "Availability", "select", { opts: "QUAL_AVAIL" }], ["delivery", "Delivery sites", "text", { max: 200 }],
        ["entry", "Entry requirements", "textarea", { max: 400, full: 1, rows: 2 }],
        ["scope", "Accreditation scope", "text", { max: 300, full: 1, ph: "e.g. Full qualification, accreditation number ..." }],
        ["summary", "Summary", "textarea", { max: 600, full: 1, rows: 3 }]
      ]
    },
    documents: {
      title: "Certificates and documents", noun: "document",
      intro: "PDF downloads shown on Accreditations & Quality (certificates) and the PAIA Manual page (category: PAIA manual). Expired documents are labelled as expired automatically.",
      view: function (r) { return r.file; },
      cols: [["Document", "title"], ["Category", "category"], ["Issued", "issued"], ["Expires", "expires"]],
      fields: [
        ["title", "Document title", "text", { req: 1, max: 200, full: 1, ph: "e.g. B-BBEE Level 1 certificate" }],
        ["category", "Category", "select", { opts: "DOC_CATS" }], ["issuer", "Issued by", "text", { max: 160, ph: "e.g. verification agency" }],
        ["issued", "Issue date", "date"], ["expires", "Expiry date", "date"],
        ["scope", "Scope", "textarea", { max: 400, full: 1, rows: 2 }], ["note", "Note", "text", { max: 300, full: 1 }],
        ["file", "PDF file", "pdf", { full: 1 }]
      ]
    }
  };
  SCHEMAS.testimonials = {
    title: "Client testimonials", noun: "testimonial",
    intro: "Shown at the bottom of the home page once at least one is published. Only publish real testimonials that the client has approved for the website.",
    view: function () { return "/#testimonials"; },
    cols: [["Name", "name"], ["Company", "company"], ["Role", "role"]],
    fields: [
      ["quote", "Testimonial", "textarea", { req: 1, max: 600, full: 1, rows: 4, hint: "The client's own words" }],
      ["name", "Name", "text", { max: 120 }], ["role", "Job title", "text", { max: 120 }],
      ["company", "Company", "text", { max: 160 }], ["photo", "Photo or company logo (optional)", "image", {}],
      ["consent", "The client approved this testimonial for publication on the website", "check", { full: 1 }]
    ]
  };
  SCHEMAS.partners = {
    title: "Partner badges", noun: "partner",
    intro: "Logos shown in the moving partner carousel on the home page, after Our values. Upload the logos in Images > Image library first (PNG with a transparent background works best).",
    view: function () { return "/#partners"; },
    cols: [["Partner", "title"], ["Website", "url"]],
    fields: [
      ["title", "Partner name", "text", { req: 1, max: 160, full: 1, hint: "Also used as the logo's alt text" }],
      ["logo", "Logo", "image", { req: 1 }], ["url", "Website (optional)", "text", { max: 400, ph: "https://..." }],
      ["note", "Short note (optional)", "text", { max: 160, ph: "e.g. Accreditation partner" }]
    ]
  };
  var st = { items: {}, editing: null, name: null };

  document.addEventListener("sc:ready", function () {
    P = window.SCPortal; esc = P.esc; api = P.api; toast = P.toast;
    Object.keys(SCHEMAS).forEach(load);
  });

  function load(name) {
    return api("c/" + name).then(function (d) { options = d.options || options; st.items[name] = d.items; renderList(name); })
      .catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function renderList(name) {
    var s = SCHEMAS[name], panel = $("#panel-" + name), items = st.items[name] || [];
    var rows = items.length ? items.map(function (r, i) {
      return "<tr>" + s.cols.map(function (c, j) { return "<td" + (j ? "" : ' class="title"') + ">" + esc(r[c[1]] || "") + "</td>"; }).join("") +
        '<td><span class="status ' + r.status + '">' + (r.status === "published" ? "Published" : "Draft") + "</span></td>" +
        '<td><div class="row-actions">' + (i ? '<button class="btn ghost small" data-l-up="' + i + '" title="Move up">&uarr;</button>' : "") +
        (r.status === "published" && s.view(r) ? '<a class="btn ghost small" target="_blank" rel="noopener" href="' + esc(s.view(r)) + '">View</a>' : "") +
        '<button class="btn ghost small" data-l-edit="' + esc(r.id) + '">Edit</button><button class="btn danger small" data-l-del="' + esc(r.id) + '">Delete</button></div></td></tr>';
    }).join("") : '<tr><td colspan="' + (s.cols.length + 2) + '" class="muted">Nothing here yet. Select "New ' + s.noun + '" to add one.</td></tr>';
    panel.innerHTML = '<div class="panel-head"><div><h1>' + esc(s.title) + '</h1><p class="muted">' + esc(s.intro) + '</p></div><button class="btn primary" data-l-new>New ' + s.noun + "</button></div>" +
      '<div class="table-wrap"><table class="posts"><thead><tr>' + s.cols.map(function (c) { return "<th>" + esc(c[0]) + "</th>"; }).join("") +
      '<th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }
  function val(r, f) { var v = r ? r[f[0]] : ""; return Array.isArray(v) ? v.join("\n") : (v == null ? "" : String(v)); }
  function openEditor(name, r) {
    var s = SCHEMAS[name], panel = $("#panel-" + name);
    st.editing = r || null; st.name = name;
    var html = s.fields.map(function (f) {
      var id = "lf-" + f[0], o = f[3] || {}, v = val(r, f), lab = '<label for="' + id + '">' + esc(f[1]) + (o.req ? ' <span class="req">*</span>' : "") + (o.hint ? ' <span class="hint">' + esc(o.hint) + "</span>" : "") + "</label>";
      var ctl;
      if (f[2] === "select") ctl = '<select id="' + id + '">' + (options[o.opts] || []).map(function (x) { return "<option" + (x === v ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>";
      else if (f[2] === "textarea" || f[2] === "lines") ctl = '<textarea id="' + id + '" rows="' + (o.rows || 4) + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + ">" + esc(f[2] === "textarea" && f[0] === "description" ? v.replace(/<\/p>\s*<p>/g, "\n\n").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "") : v) + "</textarea>";
      else if (f[2] === "image") ctl = '<div class="row-actions"><span class="img-pick" id="' + id + '" data-url="' + esc(v) + '">' + (v ? '<img src="' + esc(v) + '" alt="" style="max-height:64px;max-width:160px">' : '<span class="muted">No image chosen</span>') + '</span><button type="button" class="btn ghost small" data-l-pick="' + id + '">Choose from library</button>' + (v ? '<button type="button" class="btn ghost small" data-l-clear="' + id + '">Remove</button>' : "") + "</div>";
      else if (f[2] === "check") return '<div class="lf full"><label class="inline"><input type="checkbox" id="' + id + '"' + (r && r[f[0]] ? " checked" : "") + "> " + esc(f[1]) + "</label></div>";
      else if (f[2] === "pdf") ctl = '<div class="row-actions"><span id="lf-file-name" data-url="' + esc(v) + '" data-size="' + esc(r ? r.size || 0 : 0) + '">' + (v ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.split("/").pop()) + "</a>" : '<span class="muted">No file uploaded</span>') + '</span><label class="btn ghost small">Upload PDF<input type="file" id="lf-pdf" accept="application/pdf" hidden></label></div>';
      else ctl = '<input id="' + id + '" type="' + (f[2] === "date" ? "date" : "text") + '" value="' + esc(v) + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.req ? " required" : "") + ">";
      return '<div class="lf' + (o.full ? " full" : "") + '">' + lab + ctl + "</div>";
    }).join("");
    panel.innerHTML = '<form class="list-form" data-l-form><div class="panel-head"><div><button type="button" class="link-btn" data-l-back>&larr; ' + esc(s.title) + "</button><h1>" + (r ? "Edit " : "New ") + s.noun + "</h1></div>" +
      '<div class="row-actions"><label class="inline">Status <select id="lf-status"><option value="draft">Draft</option><option value="published"' + (r && r.status === "published" ? " selected" : "") + '>Published</option></select></label><button type="submit" class="btn primary">Save</button></div></div>' +
      '<div class="list-grid">' + html + "</div></form>";
    window.scrollTo(0, 0);
  }
  function collect(name) {
    var s = SCHEMAS[name], out = { id: st.editing ? st.editing.id : "", status: $("#lf-status").value };
    s.fields.forEach(function (f) {
      if (f[2] === "pdf") { var n = $("#lf-file-name"); out.file = n.getAttribute("data-url"); out.size = +n.getAttribute("data-size") || 0; return; }
      if (f[2] === "image") { out[f[0]] = $("#lf-" + f[0]).getAttribute("data-url") || ""; return; }
      if (f[2] === "check") { out[f[0]] = $("#lf-" + f[0]).checked; return; }
      var v = $("#lf-" + f[0]).value;
      if (f[0] === "description") v = v.trim() ? v.trim().split(/\n\s*\n/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("") : "";
      out[f[0]] = v;
    });
    return out;
  }

  document.addEventListener("click", function (e) {
    if (!P) return;
    var panel = e.target.closest("[data-panel]"); if (!panel || !SCHEMAS[panel.getAttribute("data-panel")]) return;
    var name = panel.getAttribute("data-panel"), t = e.target, list = st.items[name] || [];
    if (t.closest("[data-l-new]")) return openEditor(name, null);
    var pk = t.closest("[data-l-pick]");
    if (pk) { var tgt = $("#" + pk.getAttribute("data-l-pick")); return P.openPicker(function (u) { tgt.setAttribute("data-url", u); tgt.innerHTML = '<img src="' + esc(u) + '" alt="" style="max-height:64px;max-width:160px">'; }); }
    var cl = t.closest("[data-l-clear]");
    if (cl) { var tg = $("#" + cl.getAttribute("data-l-clear")); tg.setAttribute("data-url", ""); tg.innerHTML = '<span class="muted">No image chosen</span>'; return; }
    if (t.closest("[data-l-back]")) { st.editing = null; return load(name); }
    var ed = t.closest("[data-l-edit]"); if (ed) { var r = list.filter(function (x) { return x.id === ed.getAttribute("data-l-edit"); })[0]; if (r) openEditor(name, r); return; }
    var del = t.closest("[data-l-del]");
    if (del) {
      if (!confirm("Delete this " + SCHEMAS[name].noun + " permanently?" + (name === "documents" ? " The PDF file is deleted too." : ""))) return;
      api("c/" + name + "/" + encodeURIComponent(del.getAttribute("data-l-del")), { method: "DELETE" }).then(function () { toast("Deleted."); load(name); }).catch(function (er) { toast(er.message, true); });
      return;
    }
    var up = t.closest("[data-l-up]");
    if (up) {
      var i = +up.getAttribute("data-l-up"), ids = list.map(function (x) { return x.id; }), x = ids[i]; ids[i] = ids[i - 1]; ids[i - 1] = x;
      api("c/" + name + "/order", { method: "POST", json: { ids: ids } }).then(function () { load(name); }).catch(function (er) { toast(er.message, true); });
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id !== "lf-pdf" || !P) return;
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 4.5 * 1048576) { toast("That PDF is larger than 4.5 MB. Compress it and try again.", true); return; }
    var fd = new FormData(); fd.append("file", f); fd.append("kind", "doc");
    toast("Uploading " + f.name + "...");
    api("media", { method: "POST", body: fd }).then(function (r) {
      var n = $("#lf-file-name"); n.setAttribute("data-url", r.url); n.setAttribute("data-size", r.size);
      n.innerHTML = '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(f.name) + "</a>";
      toast("PDF uploaded. Save the document to publish it.");
    }).catch(function (er) { toast(er.message, true); });
  });
  document.addEventListener("submit", function (e) {
    if (!e.target.matches("[data-l-form]")) return;
    e.preventDefault();
    var name = st.name, btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    api("c/" + name, { method: "POST", json: collect(name) }).then(function (r) {
      toast(r.item.status === "published" ? "Saved and published." : "Draft saved.");
      st.editing = r.item; return load(name).then(function () { openEditor(name, r.item); });
    }).catch(function (er) { toast(er.message, true); }).finally(function () { btn.disabled = false; });
  });
})();
