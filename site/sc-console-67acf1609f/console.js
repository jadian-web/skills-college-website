/* Skills College management portal */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SERVICES = [
    ["/for-employers/skills-development-strategy/", "Skills Development Strategy"], ["/for-employers/learnerships-internships/", "Learnerships & Internships"],
    ["/for-employers/higher-education-bursaries/", "Higher Education Bursaries"], ["/for-employers/higher-education-bursaries/ignite-bursaries/", "Ignite Bursaries"],
    ["/for-employers/disability-skills-development/", "Disability Skills Development"], ["/for-employers/b-bbee-absorption/", "B-BBEE Absorption"],
    ["/for-employers/accredited-training/", "Accredited Training"], ["/qcto/", "QCTO"], ["/qcto/qualifications/", "QCTO Qualifications"]
  ];
  var state = { uploads: [], posts: [], categories: [], editing: null, pickerCb: null };

  /* ---------- helpers ---------- */
  function toast(msg, bad) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { "x-sc-admin": "1" };
    if (opts.json !== undefined) { headers["content-type"] = "application/json"; opts.body = JSON.stringify(opts.json); }
    return fetch("/api/admin/" + path, { method: opts.method || "GET", headers: headers, body: opts.body, credentials: "same-origin" })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.status === 401 && path !== "login") { showLogin("Your session has ended. Please sign in again."); throw new Error("signed out"); }
          if (!r.ok) {
            if (!data.error && (r.status === 502 || r.status === 404 || r.status === 405))
              throw new Error("The portal's server functions are not responding (" + r.status + "). Open " + location.origin + "/api/admin/health and send the result to your developer.");
            throw new Error(data.error || "Something went wrong (" + r.status + ").");
          }
          return data;
        });
      });
  }
  function kb(n) { return n ? (n / 1024 > 1024 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB") : ""; }

  /* ---------- sign in ---------- */
  function showLogin(msg) {
    $("#app").hidden = true; $("#login").hidden = false;
    var e = $("#login-error"); e.hidden = !msg; e.textContent = msg || "";
    setTimeout(function () { $("#u").focus(); }, 50);
  }
  function showApp() { $("#login").hidden = true; $("#app").hidden = false; loadMedia(); loadPosts(); }

  $("#login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var b = $("#login-btn"); b.disabled = true; b.textContent = "Signing in...";
    api("login", { method: "POST", json: { username: $("#u").value, password: $("#p").value } })
      .then(function () { $("#p").value = ""; showApp(); })
      .catch(function (err) { var e = $("#login-error"); e.textContent = err.message; e.hidden = false; })
      .finally(function () { b.disabled = false; b.textContent = "Sign in"; });
  });
  $("#logout").addEventListener("click", function () { api("logout", { method: "POST" }).finally(function () { showLogin(); }); });

  api("session").then(showApp).catch(function () { showLogin(); });

  /* ---------- tabs ---------- */
  $$(".tabs button").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tabs button").forEach(function (x) { x.setAttribute("aria-selected", x === t ? "true" : "false"); });
      $$("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });

  /* ---------- images ---------- */
  function loadMedia() {
    return api("media").then(function (d) {
      state.uploads = d.uploads;
      var v = Date.now();
      $("#slots").innerHTML = d.slots.map(function (s) {
        var badge = s.hidden ? '<span class="badge hidden">Removed from site</span>' : s.replaced ? '<span class="badge replaced">Replaced</span>' : '<span class="badge original">Original</span>';
        return '<article class="slot" data-name="' + esc(s.name) + '">' +
          '<div class="thumb"' + (/white/.test(s.name) ? ' style="background:#050038"' : "") + '>' + (s.hidden ? '<span class="muted">Hidden</span>' : '<img src="/media/' + esc(s.name) + "?v=" + v + '" alt="">') + "</div>" +
          '<div class="info"><h3>' + esc(s.label) + '</h3><p class="file">' + esc(s.name) + "</p>" + badge +
          "<details><summary>Used on " + s.pages.length + " page" + (s.pages.length === 1 ? "" : "s") + "</summary>" +
          s.pages.map(function (p) { return '<a href="' + esc(p) + '" target="_blank" rel="noopener">' + esc(p) + "</a>"; }).join("") + "</details></div>" +
          '<div class="actions"><label class="btn ghost small">Replace<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-replace hidden></label>' +
          (s.replaced || s.hidden ? '<button class="btn ghost small" data-restore>Restore original</button>' : "") +
          (!s.hidden ? '<button class="btn danger small" data-hide>Remove</button>' : "") + "</div></article>";
      }).join("");
      renderLibrary();
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }

  function renderLibrary() {
    $("#library").innerHTML = state.uploads.length ? state.uploads.map(function (u) {
      return '<div class="lib-item"><img src="' + esc(u.url) + '" alt="" loading="lazy"><div class="meta">' + esc(u.originalName || u.name) + "<br>" + kb(u.size) + "</div>" +
        '<div class="actions"><button class="btn ghost small" data-copy="' + esc(u.url) + '">Copy link</button><button class="btn danger small" data-delete="' + esc(u.name) + '">Delete</button></div></div>';
    }).join("") : '<p class="empty">No images uploaded yet.</p>';
  }

  function upload(file, slot) {
    var fd = new FormData(); fd.append("file", file); if (slot) fd.append("slot", slot);
    return api("media", { method: "POST", body: fd });
  }

  $("#slots").addEventListener("change", function (ev) {
    var input = ev.target.closest("[data-replace]"); if (!input || !input.files[0]) return;
    var name = input.closest(".slot").getAttribute("data-name");
    toast("Uploading...");
    upload(input.files[0], name).then(function () { toast("Image replaced. It is now live on the website."); loadMedia(); })
      .catch(function (e) { toast(e.message, true); });
  });
  $("#slots").addEventListener("click", function (ev) {
    var slot = ev.target.closest(".slot"); if (!slot) return;
    var name = slot.getAttribute("data-name");
    if (ev.target.closest("[data-restore]")) {
      api("media/restore", { method: "POST", json: { name: name } }).then(function () { toast("Original image restored."); loadMedia(); }).catch(function (e) { toast(e.message, true); });
    }
    if (ev.target.closest("[data-hide]")) {
      if (!confirm("Remove this image from every page it appears on? You can restore it later.")) return;
      api("media/hide", { method: "POST", json: { name: name } }).then(function () { toast("Image removed from the website."); loadMedia(); }).catch(function (e) { toast(e.message, true); });
    }
  });

  function uploadMany(files) {
    files = Array.prototype.slice.call(files || []); if (!files.length) return Promise.resolve([]);
    toast("Uploading " + files.length + " image" + (files.length > 1 ? "s" : "") + "...");
    return files.reduce(function (p, f) {
      return p.then(function (acc) { return upload(f).then(function (r) { acc.push(r); return acc; }).catch(function (e) { toast(f.name + ": " + e.message, true); return acc; }); });
    }, Promise.resolve([])).then(function (res) { if (res.length) toast(res.length + " image" + (res.length > 1 ? "s" : "") + " uploaded."); return loadMedia().then(function () { return res; }); });
  }
  $("#lib-input").addEventListener("change", function (e) { uploadMany(e.target.files); e.target.value = ""; });
  var dz = $("#dropzone");
  ["dragenter", "dragover"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove("over"); }); });
  dz.addEventListener("drop", function (e) { uploadMany(e.dataTransfer.files); });

  $("#library").addEventListener("click", function (ev) {
    var c = ev.target.closest("[data-copy]");
    if (c) {
      var full = location.origin + c.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(function () { toast("Link copied."); }).catch(function () { prompt("Copy this link:", full); });
    }
    var d = ev.target.closest("[data-delete]");
    if (d) {
      if (!confirm("Delete this image permanently? Any blog post using it will show no image.")) return;
      api("media?name=" + encodeURIComponent(d.getAttribute("data-delete")), { method: "DELETE" }).then(function () { toast("Image deleted."); loadMedia(); }).catch(function (e) { toast(e.message, true); });
    }
  });

  /* ---------- image picker ---------- */
  var picker = $("#picker");
  function openPicker(cb) {
    state.pickerCb = cb;
    $("#picker-grid").innerHTML = state.uploads.length ? state.uploads.map(function (u) {
      return '<div class="lib-item" data-url="' + esc(u.url) + '" tabindex="0"><img src="' + esc(u.url) + '" alt=""><div class="meta">' + esc(u.originalName || u.name) + "</div></div>";
    }).join("") : '<p class="empty">The library is empty. Upload an image above.</p>';
    picker.showModal();
  }
  $("#picker-grid").addEventListener("click", function (e) {
    var it = e.target.closest("[data-url]"); if (!it) return;
    picker.close(); state.pickerCb && state.pickerCb(it.getAttribute("data-url"));
  });
  $("#picker-close").addEventListener("click", function () { picker.close(); });
  $("#picker-upload").addEventListener("change", function (e) {
    uploadMany(e.target.files).then(function (res) { e.target.value = ""; if (res[0]) { picker.close(); state.pickerCb && state.pickerCb(res[0].url); } });
  });

  /* ---------- posts ---------- */
  function loadPosts() {
    return api("posts").then(function (d) {
      state.posts = d.posts; state.categories = d.categories;
      $("#f-category").innerHTML = d.categories.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
      $("#post-rows").innerHTML = d.posts.length ? d.posts.map(function (p) {
        return "<tr><td class=\"title\">" + esc(p.title) + "</td><td>" + esc(p.category) + "</td><td>" + esc(p.date) + "</td>" +
          '<td><span class="status ' + p.status + '">' + (p.status === "published" ? "Published" : "Draft") + "</span></td>" +
          '<td><div class="row-actions">' + (p.status === "published" ? '<a class="btn ghost small" target="_blank" rel="noopener" href="/resources/article/?slug=' + encodeURIComponent(p.slug) + '">View</a>' : "") +
          '<button class="btn ghost small" data-edit="' + esc(p.slug) + '">Edit</button><button class="btn danger small" data-del="' + esc(p.slug) + '">Delete</button></div></td></tr>';
      }).join("") : '<tr><td colspan="5" class="muted">No blog posts yet. Select "New post" to write the first one.</td></tr>';
    }).catch(function (e) { if (e.message !== "signed out") toast(e.message, true); });
  }

  $("#related").innerHTML = SERVICES.map(function (s, i) { return '<label><input type="checkbox" value="' + s[0] + '" id="rel' + i + '"> ' + esc(s[1]) + "</label>"; }).join("");

  function sourceRow(s) {
    var row = document.createElement("div"); row.className = "source-row";
    row.innerHTML = '<input placeholder="Label, e.g. QCTO website" value="' + esc(s && s.label) + '"><input placeholder="https://..." value="' + esc(s && s.url) + '"><button type="button" class="btn ghost small">Remove</button>';
    row.querySelector("button").onclick = function () { row.remove(); };
    $("#sources").appendChild(row);
  }
  $("#add-source").addEventListener("click", function () { sourceRow(); });

  function setCover(url) {
    $("#cover-preview").innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : '<span class="muted">No cover image</span>';
    $("#cover-preview").setAttribute("data-url", url || "");
  }
  $("#pick-cover").addEventListener("click", function () { openPicker(setCover); });
  $("#clear-cover").addEventListener("click", function () { setCover(""); });

  var slugTouched = false;
  var slugify = function (s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); };
  $("#f-title").addEventListener("input", function () { if (!slugTouched) $("#f-slug").value = slugify(this.value); });
  $("#f-slug").addEventListener("input", function () { slugTouched = true; });

  function openEditor(p) {
    state.editing = p || null; slugTouched = !!p;
    $("#editor-title").textContent = p ? "Edit post" : "New post";
    $("#f-title").value = p ? p.title : "";
    $("#f-slug").value = p ? p.slug : "";
    $("#f-summary").value = p ? p.summary : "";
    $("#f-body").innerHTML = p ? p.body : "";
    $("#f-takeaways").value = p ? (p.takeaways || []).join("\n") : "";
    $("#f-status").value = p ? p.status : "draft";
    $("#f-date").value = p ? p.date : new Date().toISOString().slice(0, 10);
    $("#f-category").value = p ? p.category : state.categories[0];
    $("#f-audience").value = p ? p.audience : "employers";
    $("#f-cover-alt").value = p ? p.coverAlt || "" : "";
    setCover(p ? p.cover : "");
    $$("#related input").forEach(function (c) { c.checked = !!(p && (p.related || []).indexOf(c.value) > -1); });
    $("#sources").innerHTML = ""; (p && p.sources || []).forEach(sourceRow);
    var live = $("#view-live"); live.hidden = !(p && p.status === "published"); if (p) live.href = "/resources/article/?slug=" + encodeURIComponent(p.slug);
    $("#post-list-view").hidden = true; $("#post-form").hidden = false; window.scrollTo(0, 0);
  }
  function closeEditor() { $("#post-form").hidden = true; $("#post-list-view").hidden = false; loadPosts(); }
  $("#new-post").addEventListener("click", function () { openEditor(null); });
  $("#back").addEventListener("click", closeEditor);

  $("#post-rows").addEventListener("click", function (ev) {
    var ed = ev.target.closest("[data-edit]");
    if (ed) { var p = state.posts.filter(function (x) { return x.slug === ed.getAttribute("data-edit"); })[0]; if (p) openEditor(p); }
    var del = ev.target.closest("[data-del]");
    if (del) {
      if (!confirm("Delete this post permanently?")) return;
      api("posts/" + encodeURIComponent(del.getAttribute("data-del")), { method: "DELETE" }).then(function () { toast("Post deleted."); loadPosts(); }).catch(function (e) { toast(e.message, true); });
    }
  });

  $("#post-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var post = {
      originalSlug: state.editing ? state.editing.slug : "",
      title: $("#f-title").value, slug: $("#f-slug").value || slugify($("#f-title").value),
      summary: $("#f-summary").value, body: $("#f-body").innerHTML,
      takeaways: $("#f-takeaways").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      status: $("#f-status").value, date: $("#f-date").value, category: $("#f-category").value, audience: $("#f-audience").value,
      cover: $("#cover-preview").getAttribute("data-url") || "", coverAlt: $("#f-cover-alt").value,
      related: $$("#related input:checked").map(function (c) { return c.value; }),
      sources: $$("#sources .source-row").map(function (r) { var i = r.querySelectorAll("input"); return { label: i[0].value.trim(), url: i[1].value.trim() }; }).filter(function (s) { return s.label || s.url; })
    };
    var btn = ev.submitter || $("#post-form button[type=submit]"); btn.disabled = true;
    api("posts", { method: "POST", json: post }).then(function (r) {
      toast(r.post.status === "published" ? "Post saved and published." : "Draft saved.");
      openEditor(r.post); loadPosts();
    }).catch(function (e) { toast(e.message, true); }).finally(function () { btn.disabled = false; });
  });

  /* ---------- rich text toolbar ---------- */
  $("#toolbar").addEventListener("mousedown", function (e) { if (e.target.closest("button")) e.preventDefault(); });
  $("#toolbar").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    $("#f-body").focus();
    if (b.dataset.cmd) document.execCommand(b.dataset.cmd, false, null);
    if (b.dataset.block) document.execCommand("formatBlock", false, b.dataset.block);
    if (b.dataset.action === "link") {
      var url = prompt("Link address (https://... or a page on this site like /contact/):");
      if (url) document.execCommand("createLink", false, url);
    }
    if (b.dataset.action === "image") {
      var sel = window.getSelection(); var range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      openPicker(function (url) {
        $("#f-body").focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
        document.execCommand("insertHTML", false, '<img src="' + esc(url) + '" alt="">');
      });
    }
  });
  // Paste as plain text to avoid bringing in Word formatting
  $("#f-body").addEventListener("paste", function (e) {
    e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, t);
  });
})();
