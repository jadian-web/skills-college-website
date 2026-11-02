/* Skills College management portal: Events and Scorecard results */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var P, esc, api, toast;
  var st = { events: [], types: [], editing: null, gallery: [], results: [] };

  document.addEventListener("sc:ready", function () {
    P = window.SCPortal; esc = P.esc; api = P.api; toast = P.toast;
    loadEvents(); loadScorecards();
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
})();
