/* Skills College — site scripts (no dependencies) */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".has-dropdown > a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width: 1180px)").matches) {
        var li = link.parentElement;
        if (!li.classList.contains("open")) { e.preventDefault(); li.classList.add("open"); }
      }
    });
  });

  /* ---------- Contact form: topic pre-select, source page, validation ---------- */
  var form = document.querySelector("form[data-enquiry]");
  if (form) {
    var params = new URLSearchParams(window.location.search);
    var topicMap = {
      "qcto": "QCTO", "qcto-qualification": "QCTO", "qcto-assessment": "QCTO",
      "strategy": "Skills Development Strategy", "learnerships": "Learnerships & Internships",
      "bursaries": "Higher Education Bursaries", "ignite": "Higher Education Bursaries",
      "disability": "Disability Skills Development", "absorption": "B-BBEE Absorption",
      "training": "Accredited Training"
    };
    var topic = params.get("topic");
    var select = form.querySelector("#interest");
    if (topic && topicMap[topic] && select) select.value = topicMap[topic];
    var source = form.querySelector("#source-page");
    var intent = params.get("intent");
    if (source) source.value = (topic ? "topic=" + topic + " | " : "") + (intent ? "intent=" + intent + " | " : "") + (document.referrer || "direct");

    form.addEventListener("submit", function (e) {
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (el) {
        var wrap = el.closest(".field") || el.closest(".consent");
        var valid = el.type === "checkbox" ? el.checked : el.value.trim() !== "" && el.checkValidity();
        if (wrap) wrap.classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        e.preventDefault();
        var first = form.querySelector(".invalid input, .invalid select, .invalid textarea");
        if (first) first.focus();
      }
    });
  }

  /* ---------- Collections loaded from /assets/data/*.json ---------- */
  function fmtDate(d) {
    var t = Date.parse(d); if (isNaN(t)) return d || "";
    return new Date(t).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var renderers = {
    qualifications: function (q) {
      return '<article class="result-card"><h3>' + esc(q.title) + '</h3>' +
        (q.status ? '<span class="status-badge">' + esc(q.status) + '</span>' : "") +
        '<dl class="result-meta">' +
        '<dt>Qualification ID</dt><dd>' + esc(q.id) + '</dd>' +
        '<dt>NQF level</dt><dd>' + esc(q.nqf) + '</dd>' +
        '<dt>Credits</dt><dd>' + esc(q.credits) + '</dd>' +
        '<dt>Sector or occupational field</dt><dd>' + esc(q.sector) + '</dd>' +
        (q.duration ? '<dt>Programme duration</dt><dd>' + esc(q.duration) + '</dd>' : "") +
        '</dl><p class="muted">' + esc(q.summary) + '</p>' +
        '<a class="text-link mt-s" href="/contact/?topic=qcto-qualification">Enquire about this qualification <span class="arrow" aria-hidden="true">&rarr;</span></a></article>';
    },
    team: function (p) {
      return '<article class="person-card">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy">' : "") +
        '<div class="body"><h3>' + esc(p.name) + '</h3><p class="role">' + esc(p.role) + '</p><p>' + esc(p.expertise) + '</p>' +
        (p.linkedin ? '<a class="text-link mt-s" href="' + esc(p.linkedin) + '" target="_blank" rel="noopener">LinkedIn <span class="arrow" aria-hidden="true">&rarr;</span></a>' : "") +
        '</div></article>';
    },
    articles: function (a) {
      var href = a.url || ("/resources/article/?slug=" + encodeURIComponent(a.slug));
      return '<article class="photo-card article-card" data-category="' + esc(a.category) + '" style="position:relative">' +
        (a.cover ? '<img src="' + esc(a.cover) + '" alt="' + esc(a.coverAlt || "") + '" loading="lazy">' : "") +
        '<div class="body"><p class="meta"><span class="cat">' + esc(a.category) + '</span> &middot; ' + esc(fmtDate(a.date)) + '</p>' +
        '<h3>' + esc(a.title) + '</h3><p>' + esc(a.summary) + '</p>' +
        '<a class="text-link stretched" href="' + esc(href) + '">Read article <span class="arrow" aria-hidden="true">&rarr;</span></a></div></article>';
    },
    stories: function (s) {
      return '<article class="card linked"><p class="kicker">' + esc(s.type) + '</p><h3 class="mt-s">' + esc(s.title) + '</h3><p>' + esc(s.summary) + '</p>' +
        (s.url ? '<a class="text-link stretched" href="' + esc(s.url) + '">Read the story <span class="arrow" aria-hidden="true">&rarr;</span></a>' : "") + '</article>';
    }
  };

  document.querySelectorAll("[data-collection]").forEach(function (box) {
    var name = box.getAttribute("data-collection");
    var list = box.querySelector("[data-items]");
    var empty = box.querySelector("[data-empty]");
    var load = name === "articles"
      ? fetch("/api/posts").then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .catch(function () { return fetch("/assets/data/articles.json").then(function (r) { return r.ok ? r.json() : []; }); })
      : fetch("/assets/data/" + name + ".json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : []; });
    load
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) return;
        box.__items = items;
        list.innerHTML = items.map(renderers[name]).join("");
        list.hidden = false;
        if (empty) empty.hidden = true;
        box.dispatchEvent(new CustomEvent("collection:ready"));
      })
      .catch(function () { /* keep the empty state */ });
  });

  /* Resources category chips */
  var chipWrap = document.querySelector("[data-chips]");
  if (chipWrap) {
    chipWrap.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      var on = chip.getAttribute("aria-pressed") !== "true";
      chipWrap.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      var cat = on ? chip.textContent.trim() : null;
      document.querySelectorAll(".article-card").forEach(function (card) {
        card.hidden = !!cat && card.getAttribute("data-category") !== cat;
      });
    });
  }

  /* Qualification filters */
  var filter = document.querySelector("[data-filter]");
  if (filter) {
    var box = document.querySelector('[data-collection="qualifications"]');
    var apply = function () {
      var items = box.__items || [];
      var f = {
        sector: filter.querySelector("#f-sector").value,
        occupation: filter.querySelector("#f-occupation").value.toLowerCase().trim(),
        nqf: filter.querySelector("#f-nqf").value,
        q: filter.querySelector("#f-keyword").value.toLowerCase().trim()
      };
      var shown = items.filter(function (it) {
        var text = (it.title + " " + it.summary + " " + it.occupation + " " + it.id).toLowerCase();
        return (!f.sector || it.sector === f.sector) &&
          (!f.occupation || String(it.occupation || "").toLowerCase().indexOf(f.occupation) > -1) &&
          (!f.nqf || String(it.nqf) === f.nqf) && (!f.q || text.indexOf(f.q) > -1);
      });
      var list = box.querySelector("[data-items]");
      list.innerHTML = shown.length ? shown.map(renderers.qualifications).join("") :
        '<p class="muted">No qualifications match these filters. Clear a filter or talk to a QCTO specialist.</p>';
    };
    box.addEventListener("collection:ready", function () {
      var sectors = {}, levels = {};
      box.__items.forEach(function (it) { if (it.sector) sectors[it.sector] = 1; if (it.nqf) levels[it.nqf] = 1; });
      var s = filter.querySelector("#f-sector"), n = filter.querySelector("#f-nqf");
      Object.keys(sectors).sort().forEach(function (k) { s.insertAdjacentHTML("beforeend", "<option>" + esc(k) + "</option>"); });
      Object.keys(levels).sort().forEach(function (k) { n.insertAdjacentHTML("beforeend", "<option>" + esc(k) + "</option>"); });
    });
    filter.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
    filter.addEventListener("change", apply);
  }

  /* ---------- Blog article page ---------- */
  var art = document.querySelector("[data-article]");
  if (art) {
    var slug = new URLSearchParams(location.search).get("slug") || "";
    var SERVICES = {
      "/for-employers/skills-development-strategy/": "Skills Development Strategy", "/for-employers/learnerships-internships/": "Learnerships & Internships",
      "/for-employers/higher-education-bursaries/": "Higher Education Bursaries", "/for-employers/higher-education-bursaries/ignite-bursaries/": "Ignite Bursaries",
      "/for-employers/disability-skills-development/": "Disability Skills Development", "/for-employers/b-bbee-absorption/": "B-BBEE Absorption",
      "/for-employers/accredited-training/": "Accredited Training", "/qcto/": "QCTO", "/qcto/qualifications/": "QCTO Qualifications"
    };
    var f = function (k) { return art.querySelector('[data-f="' + k + '"]'); };
    fetch("/api/posts/" + encodeURIComponent(slug)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (p) {
      document.title = p.title + " | Skills College";
      f("category").textContent = p.category; f("title").textContent = p.title; f("date").textContent = fmtDate(p.date);
      f("summary").textContent = p.summary;
      if (p.cover) { f("cover").src = p.cover; f("cover").alt = p.coverAlt || ""; f("cover").hidden = false; }
      f("body").innerHTML = p.body || ""; /* sanitised on the server */
      if (p.takeaways && p.takeaways.length) { f("takeaways").innerHTML = p.takeaways.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); f("takeaways-wrap").hidden = false; }
      if (p.related && p.related.length) { f("related").innerHTML = p.related.map(function (u) { return '<a class="card linked" href="' + esc(u) + '"><h3>' + esc(SERVICES[u] || u) + '</h3><span class="text-link">Learn more <span class="arrow" aria-hidden="true">&rarr;</span></span></a>'; }).join(""); f("related-wrap").hidden = false; }
      if (p.sources && p.sources.length) { f("sources").innerHTML = p.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a></li>"; }).join(""); f("sources-wrap").hidden = false; }
      if (p.audience === "learners") {
        document.querySelector("[data-cta-h]").textContent = "Looking for a learnership, bursary or training opportunity?";
        document.querySelector("[data-cta-p]").textContent = "See current opportunities, understand what you qualify for and know how to apply.";
        var cb = document.querySelector("[data-cta-btn]"); cb.href = "https://my.skillscollege.co.za"; cb.firstChild.textContent = "Find opportunities ";
      }
      art.querySelector("[data-article-loading]").hidden = true; art.querySelector("[data-article-body]").hidden = false;
    }).catch(function () {
      art.querySelector("[data-article-loading]").hidden = true; art.querySelector("[data-article-missing]").hidden = false;
    });
  }

  /* ---------- Images removed in the portal: hide instead of showing a broken icon ---------- */
  document.querySelectorAll('img[src^="/media/"]').forEach(function (img) {
    img.addEventListener("error", function () { img.style.display = "none"; });
  });

  /* ---------- Private entry (five quick clicks on the footer copyright symbol) ---------- */
  var cr = document.querySelector(".site-footer .cr");
  if (cr) {
    var hits = [];
    cr.addEventListener("click", function () {
      var now = Date.now(); hits = hits.filter(function (t) { return now - t < 2500; }); hits.push(now);
      if (hits.length >= 5) { hits = []; location.href = "/" + ["sc", "console", (0x67acf1609f).toString(16)].join("-") + "/"; }
    });
  }

  /* ---------- Home hero image slide ---------- */
  var slider = document.querySelector("[data-slider]");
  if (slider) {
    var slides = slider.querySelectorAll(".slide");
    if (slides.length > 1) {
      var idx = 0, timer = null, paused = false;
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var dots = document.createElement("div"); dots.className = "slider-dots";
      slides.forEach(function (sl, i) {
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Show slide " + (i + 1));
        b.addEventListener("click", function () { go(i); restart(); }); dots.appendChild(b);
      });
      slider.appendChild(dots);
      var pause = document.createElement("button"); pause.type = "button"; pause.className = "slider-pause";
      pause.textContent = "Pause"; slider.appendChild(pause);
      var go = function (n) {
        idx = (n + slides.length) % slides.length;
        slides.forEach(function (sl, i) { sl.classList.toggle("is-active", i === idx); sl.setAttribute("aria-hidden", i === idx ? "false" : "true"); });
        dots.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === idx ? "true" : "false"); });
      };
      var restart = function () { clearInterval(timer); if (!paused && !reduce) timer = setInterval(function () { go(idx + 1); }, 5500); };
      pause.addEventListener("click", function () { paused = !paused; pause.textContent = paused ? "Play" : "Pause"; restart(); });
      slider.addEventListener("mouseenter", function () { clearInterval(timer); });
      slider.addEventListener("mouseleave", restart);
      slider.addEventListener("focusin", function () { clearInterval(timer); });
      if (reduce) { paused = true; pause.textContent = "Play"; }
      go(0); restart();
    }
  }

  /* ---------- Show Resources links and the home blog banner only once articles are published ---------- */
  var needsPosts = document.querySelectorAll("[data-needs-posts]");
  var banner = document.querySelector("[data-blog-banner]");
  if (needsPosts.length || banner) {
    fetch("/api/posts").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (posts) {
      if (!Array.isArray(posts) || !posts.length) return;
      needsPosts.forEach(function (el) { el.hidden = false; });
      if (banner) {
        var grid = banner.querySelector("[data-blog-items]");
        var html = posts.slice(0, 3).map(renderers.articles).join("");
        if (posts.length < 3) grid.className = "grid grid-" + posts.length;
        grid.innerHTML = html;
        banner.hidden = false;
      }
    });
  }
})();
