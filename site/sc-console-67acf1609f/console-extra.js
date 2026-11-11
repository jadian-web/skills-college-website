/* Skills College management portal: Events and Scorecard results */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var P, esc, api, toast;
  var st = { events: [], types: [], editing: null, gallery: [], results: [] };

  document.addEventListener("sc:ready", function () {
    P = window.SCPortal; esc = P.esc; api = P.api; toast = P.toast;
    loadEvents(); loadScorecards(); loadTeam(); loadGroups(); loadContentPages();
  });

  /* ================= EVENTS ================= */
  function loadEvents() {
    return api("events").then(function (d) {
      st.events = d.events; st.types = d.types;
      $("#ev-type").innerHTML = d.types.map(function (t) { return "<option>" + esc(t) + "</option>"; }).join("");
      $("#event-rows").innerHTML = d.events.length ? d.events.map(function (ev) {
        return '<tr><td class="title">' + esc(ev.title) + "</td><td>" + esc(ev.type) + "</td><td>" + esc(ev.date) + "</td><td>" + (ev.gallery || []).length + "</td>" +
          '<td><span class="status ' + ev.status + '">' + (ev.status === "published" ? "Published" : "Draft") + "</span></td>" +
          '<td><div class="row-actions">' + (ev.status === "published" ? '<a class="btn ghost small" target="_blank" rel="noopener" href="/about/events/?event=' + encodeURIComponent(ev.slug) + '">View</a>' : "") +
          '<button class="btn ghost small" data-ev-edit="' + esc(ev.slug) + '">Edit</button><button class="btn danger small" data-ev-del="' + esc(ev.slug) + '">Delete</button></div></td></tr>';
      }).join("") : '<tr><td colspan="6" class="muted">No events yet. Select "New event" to add your first one, for example a go-karting or disc golf day.</td></tr>';
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }

  function setCover(url) {
    $("#ev-cover-preview").innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : '<span class="muted">No cover image</span>';
    $("#ev-cover-preview").setAttribute("data-url", url || "");
  }
  function renderGallery() {
    $("#ev-gallery").innerHTML = st.gallery.length ? st.gallery.map(function (u, i) {
      return '<div class="g"><img src="' + esc(u) + '" alt=""><button type="button" data-g-del="' + i + '" title="Remove from gallery">Remove</button>' +
        (i ? '<button type="button" class="mv" data-g-up="' + i + '" title="Move earlier">&larr;</button>' : "") + "</div>";
    }).join("") : '<p class="empty">No photos yet. Upload photos or add them from the image library.</p>';
  }
  function openEditor(ev) {
    st.editing = ev || null;
    $("#ev-editor-title").textContent = ev ? "Edit event" : "New event";
    $("#ev-title").value = ev ? ev.title : "";
    $("#ev-summary").value = ev ? ev.summary || "" : "";
    $("#ev-body").innerHTML = ev ? ev.body || "" : "";
    $("#ev-status").value = ev ? ev.status : "draft";
    $("#ev-type").value = ev ? ev.type : st.types[0];
    $("#ev-date").value = ev ? ev.date : new Date().toISOString().slice(0, 10);
    $("#ev-time").value = ev ? ev.time || "" : "";
    $("#ev-location").value = ev ? ev.location || "" : "";
    $("#ev-cover-alt").value = ev ? ev.coverAlt || "" : "";
    setCover(ev ? ev.cover : "");
    st.gallery = ev ? (ev.gallery || []).slice() : []; renderGallery();
    var live = $("#ev-view-live"); live.hidden = !(ev && ev.status === "published"); if (ev) live.href = "/about/events/?event=" + encodeURIComponent(ev.slug);
    $("#event-list-view").hidden = true; $("#event-form").hidden = false; window.scrollTo(0, 0);
  }
  function closeEditor() { $("#event-form").hidden = true; $("#event-list-view").hidden = false; loadEvents(); }

  document.addEventListener("click", function (e) {
    if (!P) return;
    var t = e.target;
    if (t.closest("#new-event")) return openEditor(null);
    if (t.closest("#ev-back")) return closeEditor();
    var ed = t.closest("[data-ev-edit]");
    if (ed) { var ev = st.events.filter(function (x) { return x.slug === ed.getAttribute("data-ev-edit"); })[0]; if (ev) openEditor(ev); return; }
    var del = t.closest("[data-ev-del]");
    if (del) {
      if (!confirm("Delete this event permanently? The photos stay in the image library.")) return;
      api("events/" + encodeURIComponent(del.getAttribute("data-ev-del")), { method: "DELETE" }).then(function () { toast("Event deleted."); loadEvents(); }).catch(function (er) { toast(er.message, true); });
      return;
    }
    if (t.closest("#ev-pick-cover")) return P.openPicker(setCover);
    if (t.closest("#ev-clear-cover")) return setCover("");
    if (t.closest("#ev-gallery-pick")) return P.openPicker(function (u) { if (st.gallery.indexOf(u) < 0) st.gallery.push(u); renderGallery(); });
    var gd = t.closest("[data-g-del]"); if (gd) { st.gallery.splice(+gd.getAttribute("data-g-del"), 1); renderGallery(); return; }
    var gu = t.closest("[data-g-up]"); if (gu) { var i = +gu.getAttribute("data-g-up"); var x = st.gallery[i]; st.gallery[i] = st.gallery[i - 1]; st.gallery[i - 1] = x; renderGallery(); }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id !== "ev-gallery-upload" || !P) return;
    var input = e.target;
    P.uploadMany(input.files).then(function (res) {
      res.forEach(function (r) { st.gallery.push(r.url); });
      if (!$("#ev-cover-preview").getAttribute("data-url") && st.gallery[0]) setCover(st.gallery[0]);
      renderGallery(); input.value = "";
    });
  });

  var tb = $("#ev-toolbar");
  tb.addEventListener("mousedown", function (e) { if (e.target.closest("button")) e.preventDefault(); });
  tb.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    $("#ev-body").focus();
    if (b.dataset.cmd) document.execCommand(b.dataset.cmd, false, null);
    if (b.dataset.block) document.execCommand("formatBlock", false, b.dataset.block);
  });
  $("#ev-body").addEventListener("paste", function (e) { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });

  $("#event-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var ev = {
      originalSlug: st.editing ? st.editing.slug : "",
      slug: st.editing ? st.editing.slug : "",
      title: $("#ev-title").value, summary: $("#ev-summary").value, body: $("#ev-body").innerHTML,
      status: $("#ev-status").value, type: $("#ev-type").value, date: $("#ev-date").value, time: $("#ev-time").value, location: $("#ev-location").value,
      cover: $("#ev-cover-preview").getAttribute("data-url") || "", coverAlt: $("#ev-cover-alt").value, gallery: st.gallery
    };
    var btn = e.submitter || $("#event-form button[type=submit]"); btn.disabled = true;
    api("events", { method: "POST", json: ev }).then(function (r) {
      toast(r.event.status === "published" ? "Event saved and published." : "Draft saved.");
      openEditor(r.event); loadEvents();
    }).catch(function (er) { toast(er.message, true); }).finally(function () { btn.disabled = false; });
  });

  /* ================= SCORECARD RESULTS ================= */
  function loadScorecards() {
    return api("scorecards").then(function (d) {
      st.results = d.results;
      var fresh = d.results.filter(function (r) { return r.status === "new"; }).length;
      var c = $("#sc-new"); c.textContent = fresh; c.hidden = !fresh;
      $("#sc-rows").innerHTML = d.results.length ? d.results.map(function (r, i) {
        return '<tr data-i="' + i + '"><td>' + esc(new Date(r.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })) + '</td><td class="title">' + esc(r.company) + "<br><small class=\"muted\">" + esc(r.sector) + "</small></td>" +
          "<td>" + esc(r.contact) + '<br><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a>" + (r.phone ? "<br>" + esc(r.phone) : "") + "</td><td>" + esc(r.category) + "<br><small class=\"muted\">" + esc(r.scorecard) + "</small></td>" +
          '<td><span class="lvl">' + esc(r.level) + "</span><br><small class=\"muted\">" + (r.points === null ? "Affidavit" : esc(r.points) + " pts") + (r.discounted ? ", discounted" : "") + "</small></td>" +
          '<td><select class="small" data-sc-status="' + esc(r.key) + '">' + ["new", "contacted", "closed"].map(function (s) { return "<option" + (s === r.status ? " selected" : "") + ' value="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + "</option>"; }).join("") + "</select></td>" +
          '<td><div class="row-actions"><button class="btn ghost small" data-sc-view="' + i + '">Details</button><button class="btn danger small" data-sc-del="' + esc(r.key) + '">Delete</button></div></td></tr>';
      }).join("") : '<tr><td colspan="7" class="muted">No calculator results yet.</td></tr>';
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function detail(r) {
    var els = (r.elements || []).map(function (x) { return "<li>" + esc(x.name) + ": " + esc(x.points) + " / " + esc(x.max) + (x.bonus ? " + " + esc(x.bonus) + " bonus" : "") + (x.subMin && x.subMin !== "n/a" ? " (sub-minimum " + esc(x.subMin.toLowerCase()) + ")" : "") + "</li>"; }).join("") || "<li>Automatic level on affidavit</li>";
    var notes = (r.notes || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    var inputs = Object.keys(r.inputs || {}).map(function (k) { return "<dt>" + esc(k) + "</dt><dd>" + esc(r.inputs[k]) + "</dd>"; }).join("");
    return '<tr class="sc-detail"><td colspan="7"><div class="grid"><div><h4>Elements</h4><ul>' + els + "</ul><h4 style=\"margin-top:12px\">Reference</h4><p>" + esc(r.ref) + " &middot; SETA: " + esc(r.seta || "not given") + " &middot; Turnover: R" + Number(r.turnover || 0).toLocaleString("en-ZA") + " &middot; Role: " + esc(r.role || "") + "</p></div>" +
      "<div><h4>Notes</h4><ul>" + notes + "</ul></div><div><h4>Figures entered</h4><dl>" + inputs + "</dl></div></div></td></tr>";
  }
  document.addEventListener("click", function (e) {
    if (!P) return;
    var t = e.target;
    if (t.closest("#sc-refresh")) return loadScorecards().then(function () { toast("Results refreshed."); });
    var v = t.closest("[data-sc-view]");
    if (v) {
      var row = v.closest("tr"), nx = row.nextElementSibling;
      if (nx && nx.classList.contains("sc-detail")) { nx.remove(); v.textContent = "Details"; }
      else { row.insertAdjacentHTML("afterend", detail(st.results[+v.getAttribute("data-sc-view")])); v.textContent = "Hide"; }
      return;
    }
    var d = t.closest("[data-sc-del]");
    if (d) {
      if (!confirm("Delete this result permanently? The email copy in sales@ is not affected.")) return;
      api("scorecards/" + encodeURIComponent(d.getAttribute("data-sc-del")), { method: "DELETE" }).then(function () { toast("Result deleted."); loadScorecards(); }).catch(function (er) { toast(er.message, true); });
      return;
    }
    if (t.closest("#sc-csv")) {
      var cols = ["createdAt", "ref", "company", "contact", "email", "phone", "role", "sector", "seta", "turnover", "category", "scorecard", "level", "recognition", "points", "discounted", "status"];
      var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = [cols.concat(["elements", "notes"]).join(",")].concat(st.results.map(function (r) {
        return cols.map(function (c) { return q(r[c]); }).concat([q((r.elements || []).map(function (x) { return x.name + " " + x.points + "/" + x.max; }).join("; ")), q((r.notes || []).join(" | "))]).join(",");
      })).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
      a.download = "scorecard-results-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    }
  });
  document.addEventListener("change", function (e) {
    var s = e.target.closest("[data-sc-status]"); if (!s || !P) return;
    api("scorecards/status", { method: "POST", json: { key: s.getAttribute("data-sc-status"), status: s.value } }).then(function () { toast("Status updated."); loadScorecards(); }).catch(function (er) { toast(er.message, true); });
  });
  /* ================= TEAM ================= */
  var tm = { list: [], editing: null };
  function initials(n) { return String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(""); }
  function loadTeam() {
    return api("team").then(function (d) {
      tm.list = d.team;
      var depts = []; d.team.forEach(function (p) { if (p.department && depts.indexOf(p.department) < 0) depts.push(p.department); });
      $("#tm-depts").innerHTML = depts.map(function (x) { return '<option value="' + esc(x) + '">'; }).join("");
      $("#team-rows").innerHTML = d.team.length ? d.team.map(function (p, i) {
        return '<article class="person"><div class="ph">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : esc(initials(p.name))) + "</div>" +
          '<div><h3>' + esc(p.name) + '</h3><p class="r">' + esc(p.role || "No job title") + (p.department ? " &middot; " + esc(p.department) : "") + '</p><span class="status ' + p.status + '">' + (p.status === "published" ? "Published" : "Draft") + "</span>" + (p.featured ? '<span class="badge-lead">Leadership</span>' : "") + "</div>" +
          '<div class="acts"><button class="btn ghost small" data-tm-edit="' + esc(p.id) + '">Edit</button><button class="btn danger small" data-tm-del="' + esc(p.id) + '">Delete</button>' +
          '<span class="ord"><button class="btn ghost small" data-tm-move="' + i + '" data-dir="-1" title="Move earlier"' + (i ? "" : " disabled") + '>&uarr;</button><button class="btn ghost small" data-tm-move="' + i + '" data-dir="1" title="Move later"' + (i < d.team.length - 1 ? "" : " disabled") + ">&darr;</button></span></div></article>";
      }).join("") : '<p class="empty">No team profiles yet. Select "Add person" to create the first one.</p>';
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function setPhoto(url) {
    $("#tm-photo-preview").innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : '<span class="muted">No photo</span>';
    $("#tm-photo-preview").setAttribute("data-url", url || "");
  }
  function openPerson(p) {
    tm.editing = p || null;
    $("#tm-editor-title").textContent = p ? "Edit profile" : "Add person";
    $("#tm-name").value = p ? p.name : ""; $("#tm-role").value = p ? p.role || "" : ""; $("#tm-dept").value = p ? p.department || "" : "";
    $("#tm-bio").value = p ? p.bio || "" : ""; $("#tm-linkedin").value = p ? p.linkedin || "" : ""; $("#tm-email").value = p ? p.email || "" : "";
    $("#tm-status").value = p ? p.status : "published"; $("#tm-featured").checked = !!(p && p.featured); setPhoto(p ? p.photo : "");
    $("#team-list-view").hidden = true; $("#team-form").hidden = false; window.scrollTo(0, 0);
  }
  function closePerson() { $("#team-form").hidden = true; $("#team-list-view").hidden = false; loadTeam(); }
  document.addEventListener("click", function (e) {
    if (!P) return;
    var t = e.target;
    if (t.closest("#new-person")) return openPerson(null);
    if (t.closest("#tm-back")) return closePerson();
    if (t.closest("#tm-pick-photo")) return P.openPicker(setPhoto);
    if (t.closest("#tm-clear-photo")) return setPhoto("");
    var ed = t.closest("[data-tm-edit]");
    if (ed) { var p = tm.list.filter(function (x) { return x.id === ed.getAttribute("data-tm-edit"); })[0]; if (p) openPerson(p); return; }
    var del = t.closest("[data-tm-del]");
    if (del) {
      if (!confirm("Delete this profile? Their photo stays in the image library.")) return;
      api("team/" + encodeURIComponent(del.getAttribute("data-tm-del")), { method: "DELETE" }).then(function () { toast("Profile deleted."); loadTeam(); }).catch(function (er) { toast(er.message, true); });
      return;
    }
    var mv = t.closest("[data-tm-move]");
    if (mv) {
      var i = +mv.getAttribute("data-tm-move"), j = i + (+mv.getAttribute("data-dir"));
      var ids = tm.list.map(function (x) { return x.id; }); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
      api("team/order", { method: "POST", json: { ids: ids } }).then(function () { toast("Order saved."); loadTeam(); }).catch(function (er) { toast(er.message, true); });
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id !== "tm-photo-upload" || !P) return;
    var input = e.target;
    P.uploadMany(input.files).then(function (res) { if (res[0]) setPhoto(res[0].url); input.value = ""; });
  });
  $("#team-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var p = { id: tm.editing ? tm.editing.id : "", name: $("#tm-name").value, role: $("#tm-role").value, department: $("#tm-dept").value,
      bio: $("#tm-bio").value, linkedin: $("#tm-linkedin").value.trim(), email: $("#tm-email").value.trim(), status: $("#tm-status").value, featured: $("#tm-featured").checked,
      photo: $("#tm-photo-preview").getAttribute("data-url") || "" };
    if (p.linkedin && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(p.linkedin)) { toast("LinkedIn link must start with https://www.linkedin.com/", true); return; }
    var btn = e.submitter || $("#team-form button[type=submit]"); btn.disabled = true;
    api("team", { method: "POST", json: p }).then(function (r) {
      toast(r.person.status === "published" ? "Profile saved and published." : "Draft saved.");
      tm.editing = r.person; loadTeam(); closePerson();
    }).catch(function (er) { toast(er.message, true); }).finally(function () { btn.disabled = false; });
  });
  /* ================= TEAM GROUP PHOTOS ================= */
  var gp = { list: [], editing: null };
  function loadGroups() {
    return api("team-groups").then(function (d) {
      gp.list = d.groups;
      $("#group-rows").innerHTML = d.groups.length ? d.groups.map(function (g, i) {
        return '<article class="g"><img src="' + esc(g.photo) + '" alt=""><div class="in"><h3>' + esc(g.title) + "</h3>" + (g.caption ? "<p>" + esc(g.caption) + "</p>" : "") +
          '<span class="status ' + g.status + '">' + (g.status === "published" ? "Published" : "Draft") + "</span>" +
          '<div class="acts"><button class="btn ghost small" data-gp-edit="' + esc(g.id) + '">Edit</button><button class="btn danger small" data-gp-del="' + esc(g.id) + '">Delete</button>' +
          '<span class="ord"><button class="btn ghost small" data-gp-move="' + i + '" data-dir="-1" title="Move earlier"' + (i ? "" : " disabled") + '>&uarr;</button><button class="btn ghost small" data-gp-move="' + i + '" data-dir="1" title="Move later"' + (i < d.groups.length - 1 ? "" : " disabled") + ">&darr;</button></span></div></div></article>";
      }).join("") : '<p class="empty">No group photos yet.</p>';
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function setGroupPhoto(url) {
    $("#gp-photo-preview").innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : '<span class="muted">No photo</span>';
    $("#gp-photo-preview").setAttribute("data-url", url || "");
  }
  function openGroup(g) {
    gp.editing = g || null;
    $("#gp-title").value = g ? g.title : ""; $("#gp-caption").value = g ? g.caption || "" : ""; $("#gp-alt").value = g ? g.alt || "" : "";
    $("#gp-status").value = g ? g.status : "published"; setGroupPhoto(g ? g.photo : "");
    $("#group-form").hidden = false; $("#gp-title").focus();
  }
  document.addEventListener("click", function (e) {
    if (!P) return;
    var t = e.target;
    if (t.closest("#new-group")) return openGroup(null);
    if (t.closest("#gp-cancel")) { $("#group-form").hidden = true; return; }
    if (t.closest("#gp-pick-photo")) return P.openPicker(setGroupPhoto);
    var ed = t.closest("[data-gp-edit]");
    if (ed) { var g = gp.list.filter(function (x) { return x.id === ed.getAttribute("data-gp-edit"); })[0]; if (g) openGroup(g); return; }
    var del = t.closest("[data-gp-del]");
    if (del) {
      if (!confirm("Delete this group photo? The image stays in the image library.")) return;
      api("team-groups/" + encodeURIComponent(del.getAttribute("data-gp-del")), { method: "DELETE" }).then(function () { toast("Group photo deleted."); loadGroups(); }).catch(function (er) { toast(er.message, true); });
      return;
    }
    var mv = t.closest("[data-gp-move]");
    if (mv) {
      var i = +mv.getAttribute("data-gp-move"), j = i + (+mv.getAttribute("data-dir"));
      var ids = gp.list.map(function (x) { return x.id; }); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
      api("team-groups/order", { method: "POST", json: { ids: ids } }).then(function () { toast("Order saved."); loadGroups(); }).catch(function (er) { toast(er.message, true); });
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id !== "gp-photo-upload" || !P) return;
    var input = e.target;
    P.uploadMany(input.files).then(function (res) { if (res[0]) setGroupPhoto(res[0].url); input.value = ""; });
  });
  $("#group-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var g = { id: gp.editing ? gp.editing.id : "", title: $("#gp-title").value, caption: $("#gp-caption").value, alt: $("#gp-alt").value,
      status: $("#gp-status").value, photo: $("#gp-photo-preview").getAttribute("data-url") || "" };
    if (!g.photo) { toast("Choose or upload a group photo first.", true); return; }
    var btn = e.submitter || $("#group-form button[type=submit]"); btn.disabled = true;
    api("team-groups", { method: "POST", json: g }).then(function () {
      toast(g.status === "published" ? "Group photo saved and published." : "Draft saved.");
      $("#group-form").hidden = true; loadGroups();
    }).catch(function (er) { toast(er.message, true); }).finally(function () { btn.disabled = false; });
  });
  /* ================= ACCOUNT / PASSWORD ================= */
  var RULES = {
    len: function (v) { return v.length >= 12; },
    mix: function (v) { return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(v); }).length >= 3; },
    user: function (v) { return v && v.toLowerCase().indexOf("jadian") < 0; },
    common: function (v) { return v && !/(password|skills ?college|skills2026|qwerty|123456|letmein|welcome)/i.test(v) && !/(.)\1{3,}/.test(v); }
  };
  $("#pw-new").addEventListener("input", function () {
    var v = this.value;
    $$("#pw-rules li").forEach(function (li) { li.classList.toggle("ok", RULES[li.getAttribute("data-rule")](v)); });
  });
  document.addEventListener("click", function (e) { if (e.target.closest("#go-account")) $("#tab-account").click(); });
  $("#pw-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#pw-error"); err.hidden = true;
    var cur = $("#pw-current").value, nw = $("#pw-new").value, cf = $("#pw-confirm").value;
    var bad = Object.keys(RULES).filter(function (k) { return !RULES[k](nw); });
    if (bad.length) { err.textContent = "The new password does not meet all the rules above."; err.hidden = false; return; }
    if (nw !== cf) { err.textContent = "The two new passwords do not match."; err.hidden = false; return; }
    var btn = $("#pw-btn"); btn.disabled = true; btn.textContent = "Changing...";
    api("account/password", { method: "POST", json: { current: cur, next: nw } }).then(function () {
      toast("Password changed. Other devices have been signed out.");
      $("#pw-form").reset(); $$("#pw-rules li").forEach(function (li) { li.classList.remove("ok"); });
      P.checkSetup({ usingSetupPassword: false });
    }).catch(function (er) { err.textContent = er.message; err.hidden = false; })
      .finally(function () { btn.disabled = false; btn.textContent = "Change password"; });
  });
  /* ================= WEBSITE TEXT ================= */
  var ct = { pages: [], page: null, dirty: {}, seoDirty: false };
  var strip = function (h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent; };
  function ctDirtyCount() { return Object.keys(ct.dirty).length + (ct.seoDirty ? 1 : 0); }
  function ctUpdateBar() {
    var n = ctDirtyCount();
    $("#ct-dirty").textContent = n ? n + " unsaved change" + (n === 1 ? "" : "s") : "No unsaved changes";
    $("#ct-savebar").classList.toggle("has-changes", !!n);
    $("#ct-save").disabled = !n; $("#ct-discard").disabled = !n;
  }
  function loadContentPages(keep) {
    return api("content/pages").then(function (d) {
      ct.pages = d.pages;
      var sel = $("#ct-page"), current = keep || sel.value || "/";
      sel.innerHTML = d.pages.map(function (p) { return '<option value="' + esc(p.path) + '">' + esc(p.name) + (p.edited ? " (" + p.edited + " edited)" : "") + "</option>"; }).join("");
      sel.value = current;
      if (!keep) loadContentPage(sel.value);
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function count(el, out, max) { out.textContent = el.value.length + " / " + max + " characters"; out.style.color = el.value.length > max ? "#c4163b" : ""; }
  function loadContentPage(path) {
    $("#ct-fields").innerHTML = '<p class="muted">Loading&hellip;</p>';
    return api("content/page?path=" + encodeURIComponent(path)).then(function (d) {
      ct.page = d; ct.dirty = {}; ct.seoDirty = false;
      $("#ct-view").href = path;
      $("#ct-title").value = d.titleOverride || d.title; $("#ct-desc").value = d.descOverride || d.desc;
      $("#ct-title-orig").textContent = d.titleOverride ? "Original: " + d.title : "";
      $("#ct-desc-orig").textContent = d.descOverride ? "Original: " + d.desc : "";
      count($("#ct-title"), $("#ct-title-count"), 60); count($("#ct-desc"), $("#ct-desc-count"), 160);
      renderFields(); ctUpdateBar();
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }
  function renderFields() {
    var d = ct.page, q = $("#ct-search").value.trim().toLowerCase(), onlyEdited = $("#ct-edited-only").checked;
    var groups = [], cur = null;
    d.fields.forEach(function (f, i) {
      var val = f.value !== null ? f.value : f.html;
      if (q && strip(val).toLowerCase().indexOf(q) < 0 && strip(f.html).toLowerCase().indexOf(q) < 0) return;
      if (onlyEdited && f.value === null && !(f.k in ct.dirty)) return;
      if (!cur || cur.name !== f.section) { cur = { name: f.section, items: [] }; groups.push(cur); }
      cur.items.push([f, i]);
    });
    $("#ct-fields").innerHTML = groups.length ? groups.map(function (g) {
      return '<div class="ct-group"><h3>' + esc(g.name) + "</h3>" + g.items.map(function (x) {
        var f = x[0], i = x[1], val = f.k in ct.dirty ? (ct.dirty[f.k] === null ? f.html : ct.dirty[f.k]) : (f.value !== null ? f.value : f.html);
        var edited = f.value !== null, rows = Math.min(8, Math.max(1, Math.ceil(strip(val).length / 90)));
        return '<div class="ct-field' + (edited ? " edited" : "") + (f.k in ct.dirty ? " dirty" : "") + '" data-i="' + i + '"><div class="meta"><span class="kind">' + esc(f.label) + "</span>" +
          (edited ? '<span class="flag">Edited</span>' : "") + (edited || f.k in ct.dirty ? '<button type="button" class="link-btn reset" data-ct-reset="' + i + '">Reset to original</button>' : "") + "</div>" +
          '<textarea rows="' + rows + '" data-ct-i="' + i + '" aria-label="' + esc(f.label + " in " + g.name) + '">' + esc(val) + "</textarea>" +
          (edited ? '<p class="orig">Original: ' + esc(strip(f.html)) + "</p>" : "") + "</div>";
      }).join("") + "</div>";
    }).join("") : '<p class="muted">No text matches.</p>';
  }
  $("#ct-page").addEventListener("change", function () {
    if (ctDirtyCount() && !confirm("You have unsaved changes on this page. Discard them?")) { this.value = ct.page.path; return; }
    loadContentPage(this.value);
  });
  $("#ct-search").addEventListener("input", renderFields);
  $("#ct-edited-only").addEventListener("change", renderFields);
  $("#ct-fields").addEventListener("input", function (e) {
    var t = e.target.closest("[data-ct-i]"); if (!t) return;
    var f = ct.page.fields[+t.getAttribute("data-ct-i")], orig = f.value !== null ? f.value : f.html;
    if (t.value === orig) delete ct.dirty[f.k]; else ct.dirty[f.k] = t.value;
    t.closest(".ct-field").classList.toggle("dirty", f.k in ct.dirty);
    ctUpdateBar();
  });
  $("#ct-fields").addEventListener("click", function (e) {
    var r = e.target.closest("[data-ct-reset]"); if (!r) return;
    var f = ct.page.fields[+r.getAttribute("data-ct-reset")];
    if (f.value !== null) ct.dirty[f.k] = null; else delete ct.dirty[f.k];
    renderFields(); ctUpdateBar();
  });
  ["#ct-title", "#ct-desc"].forEach(function (sel) {
    $(sel).addEventListener("input", function () {
      ct.seoDirty = true; count($("#ct-title"), $("#ct-title-count"), 60); count($("#ct-desc"), $("#ct-desc-count"), 160); ctUpdateBar();
    });
  });
  $("#ct-discard").addEventListener("click", function () { if (confirm("Discard your unsaved changes?")) loadContentPage(ct.page.path); });
  $("#ct-save").addEventListener("click", function () {
    var btn = this; btn.disabled = true; btn.textContent = "Saving...";
    var body = { path: ct.page.path, fields: ct.dirty };
    if (ct.seoDirty) { body.title = $("#ct-title").value.trim(); body.description = $("#ct-desc").value.trim(); }
    api("content/page", { method: "POST", json: body }).then(function () {
      toast("Saved. The live page updates within about a minute.");
      loadContentPages(ct.page.path); return loadContentPage(ct.page.path);
    }).catch(function (er) { toast(er.message, true); }).finally(function () { btn.textContent = "Save changes"; ctUpdateBar(); });
  });
  window.addEventListener("beforeunload", function (e) { if (ctDirtyCount()) { e.preventDefault(); e.returnValue = ""; } });
})();
