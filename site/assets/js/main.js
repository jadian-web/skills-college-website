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
      "training": "Accredited Training", "b-bbee": "B-BBEE scorecard advice", "events": "Events"
    };
    var topic = params.get("topic");
    var select = form.querySelector("#interest");
    if (topic && topicMap[topic] && select) select.value = topicMap[topic];
    var source = form.querySelector("#source-page");
    var intent = params.get("intent");
    if (source) source.value = (topic ? "topic=" + topic + " | " : "") + (intent ? "intent=" + intent + " | " : "") + (document.referrer || "direct");

    var started = Date.now(), alertBox = form.querySelector("[data-form-alert]");
    var check = function (el) {
      var wrap = el.closest(".field") || el.closest(".consent"); if (!wrap) return true;
      if (el.type !== "checkbox") el.value = el.type === "email" ? el.value.trim() : el.value.replace(/^\s+/, "");
      var empty = el.type === "checkbox" ? !el.checked : el.value.trim() === "";
      var valid = el.required ? !empty && el.checkValidity() : (empty || el.checkValidity());
      wrap.classList.toggle("invalid", !valid);
      el.setAttribute("aria-invalid", valid ? "false" : "true");
      return valid;
    };
    var fieldsToCheck = form.querySelectorAll("input:not([type=hidden]):not([name=bot-field]), select, textarea");
    fieldsToCheck.forEach(function (el) {
      el.addEventListener("blur", function () { if (el.value || el.type === "checkbox") check(el); });
      el.addEventListener("input", function () { if ((el.closest(".field") || el.closest(".consent") || {}).classList && (el.closest(".field") || el.closest(".consent")).classList.contains("invalid")) check(el); });
      el.addEventListener("change", function () { if (el.type === "checkbox" || el.tagName === "SELECT") check(el); });
    });
    form.addEventListener("submit", function (e) {
      var ok = true;
      fieldsToCheck.forEach(function (el) { if (!check(el)) ok = false; });
      if (alertBox) alertBox.hidden = true;
      if (!ok) {
        e.preventDefault();
        var first = form.querySelector(".invalid input, .invalid select, .invalid textarea");
        if (first) first.focus();
        return;
      }
      // spam protection: real people take more than a few seconds to fill in the form
      if (Date.now() - started < 3000 || form.querySelector("[name=bot-field]").value) {
        e.preventDefault();
        if (alertBox) { alertBox.textContent = "That was quick! Please check your details and press Send enquiry again."; alertBox.hidden = false; }
        started = Date.now() - 2000;
        return;
      }
      var btn = form.querySelector("button[type=submit]"); if (btn) { btn.disabled = true; btn.firstChild.textContent = "Sending... "; }
    });
  }

  /* ---------- Collections loaded from /assets/data/*.json ---------- */
  function fmtDate(d) {
    var t = Date.parse(d); if (isNaN(t)) return d || "";
    return new Date(t).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }
  function setMeta(title, desc, path) {
    var put = function (sel, attr, val) { var m = document.querySelector(sel); if (m && val) m.setAttribute(attr, val); };
    var canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = location.origin + path;
    put('meta[name="description"]', "content", desc); put('meta[property="og:description"]', "content", desc); put('meta[name="twitter:description"]', "content", desc);
    put('meta[property="og:title"]', "content", title); put('meta[name="twitter:title"]', "content", title); put('meta[property="og:url"]', "content", location.origin + path);
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
        (a.cover ? '<img src="' + esc(a.cover) + '" alt="' + esc(a.coverAlt || a.title) + '" loading="lazy">' : "") +
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
      setMeta(p.title + " | Skills College", p.summary, "/resources/article/?slug=" + encodeURIComponent(p.slug));
      f("category").textContent = p.category; f("title").textContent = p.title; f("date").textContent = fmtDate(p.date);
      f("summary").textContent = p.summary || ""; f("summary").hidden = !p.summary;
      var words = String((p.body || "").replace(/<[^>]+>/g, " ")).split(/\s+/).filter(Boolean).length;
      f("readtime").textContent = Math.max(1, Math.round(words / 220)) + " min read";
      if (p.cover) { f("cover").src = p.cover; f("cover").alt = p.coverAlt || p.title; f("cover-wrap").hidden = false; }
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
      var cl = art.querySelector("[data-copy-link]"), note = art.querySelector("[data-copy-note]");
      if (cl) cl.addEventListener("click", function () {
        var done = function () { note.textContent = "Link copied"; setTimeout(function () { note.textContent = ""; }, 2500); };
        if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { note.textContent = location.href; });
        else note.textContent = location.href;
      });
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
      go(0);
      // load the other slides only after the page has finished loading, so the first image appears faster
      var loadRest = function () { slides.forEach(function (sl) { var im = sl.querySelector("img[data-src]"); if (im) { im.src = im.getAttribute("data-src"); im.removeAttribute("data-src"); } }); };
      if (document.readyState === "complete") setTimeout(loadRest, 300); else window.addEventListener("load", function () { setTimeout(loadRest, 300); });
      setTimeout(restart, 1500);
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
  /* ---------- Programme solutions hand: opens finger by finger when scrolled into view ---------- */
  var stage = document.querySelector("[data-hand]");
  if (stage) {
    var reduceHand = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var svg = stage.querySelector(".hand-lines");
    var NS = "http://www.w3.org/2000/svg";
    var opened = false;
    var steps = [1, 2, 3, 4, 5];
    var drawLines = function () {
      if (!svg || getComputedStyle(svg).display === "none") return;
      var box = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      svg.innerHTML = "";
      steps.forEach(function (n) {
        var pin = stage.querySelector('.hand-pin[data-step="' + n + '"]');
        var icon = stage.querySelector('.sol-item[data-step="' + n + '"] .sol-icon');
        if (!pin || !icon) return;
        var a = pin.getBoundingClientRect(), b = icon.getBoundingClientRect();
        var x1 = a.left + a.width / 2 - box.left, y1 = a.top + a.height / 2 - box.top;
        var x2 = b.left - box.left - 6, y2 = b.top + b.height / 2 - box.top;
        var g = document.createElementNS(NS, "g");
        g.setAttribute("data-step", n);
        var len = Math.hypot(x2 - x1, y2 - y1);
        var d = "M" + x1.toFixed(1) + " " + y1.toFixed(1) + " L" + x2.toFixed(1) + " " + y2.toFixed(1);
        var mid = "hm" + n;
        g.innerHTML = '<mask id="' + mid + '" maskUnits="userSpaceOnUse"><path class="draw" d="' + d + '" stroke="#fff" stroke-width="8" fill="none" stroke-dasharray="' + len + '" stroke-dashoffset="' + (opened && stage.querySelector('.hand-pin[data-step="' + n + '"].on') ? 0 : len) + '"/></mask>' +
          '<path class="ln" d="' + d + '" mask="url(#' + mid + ')"/><circle class="end" cx="' + x2 + '" cy="' + y2 + '" r="4" mask="url(#' + mid + ')"/>';
        if (pin.classList.contains("on")) g.classList.add("on");
        svg.appendChild(g);
      });
    };
    var turnOn = function (n) {
      stage.querySelectorAll('[data-step="' + n + '"]').forEach(function (el) { el.classList.add("on"); });
      var draw = svg && svg.querySelector('g[data-step="' + n + '"] .draw');
      if (draw) requestAnimationFrame(function () { draw.style.strokeDashoffset = "0"; });
    };
    var open = function () {
      if (opened) return; opened = true;
      stage.classList.add("is-open");
      if (reduceHand) { steps.forEach(turnOn); return; }
      steps.forEach(function (n, i) { setTimeout(function () { turnOn(n); }, 250 + i * 420); });
    };
    stage.classList.add("hand-ready");
    drawLines();
    // Only start once every hand image is downloaded and decoded, so the fingers never pop in late
    var handImgs = Array.prototype.slice.call(stage.querySelectorAll(".hand-figure img, .sol-icon img"));
    var decoded = Promise.all(handImgs.map(function (img) {
      var done = img.complete ? Promise.resolve() : new Promise(function (r) { img.addEventListener("load", r); img.addEventListener("error", r); });
      return done.then(function () { return img.decode ? img.decode().catch(function () {}) : null; });
    }));
    var start = function () { decoded.then(function () { requestAnimationFrame(function () { drawLines(); open(); }); }); };
    if (reduceHand || !("IntersectionObserver" in window)) { start(); }
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { start(); io.disconnect(); } });
      }, { threshold: 0.12 });
      io.observe(stage);
    }
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(drawLines, 120); });
    window.addEventListener("load", drawLines);
    // Card <-> finger highlight
    stage.querySelectorAll(".sol-item").forEach(function (li) {
      var n = li.getAttribute("data-step");
      var on = function () { stage.setAttribute("data-active", n); svg && svg.querySelectorAll("g").forEach(function (g) { g.classList.toggle("dim", g.getAttribute("data-step") !== n); }); };
      var off = function () { stage.removeAttribute("data-active"); svg && svg.querySelectorAll("g").forEach(function (g) { g.classList.remove("dim"); }); };
      li.addEventListener("mouseenter", on); li.addEventListener("mouseleave", off);
      li.addEventListener("focusin", on); li.addEventListener("focusout", off);
    });
  }
  /* ---------- Events page (events managed in the portal) ---------- */
  var evPage = document.querySelector("[data-events-page]");
  if (evPage) {
    var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var today = new Date().toISOString().slice(0, 10);
    var evSlug = new URLSearchParams(location.search).get("event");
    var q = function (sel) { return evPage.querySelector(sel); };
    var card = function (ev) {
      var d = (ev.date || "").split("-");
      var cover = ev.cover ? '<img src="' + esc(ev.cover) + '" alt="' + esc(ev.coverAlt || ev.title) + '" loading="lazy">' : "";
      return '<a class="event-card" data-type="' + esc(ev.type) + '" href="/about/events/?event=' + encodeURIComponent(ev.slug) + '"><div class="cover">' + cover +
        (d.length === 3 ? '<span class="date-badge"><b>' + (+d[2]) + "</b><small>" + MON[+d[1] - 1] + " " + d[0] + "</small></span>" : "") + '</div><div class="body"><span class="event-type">' + esc(ev.type) + "</span><h3>" + esc(ev.title) + "</h3>" +
        (ev.location ? '<span class="meta">' + esc(ev.location) + "</span>" : "") + (ev.summary ? "<p>" + esc(ev.summary) + "</p>" : "") +
        '<span class="text-link">' + ((ev.gallery || []).length ? "View photos" : "View event") + ' <span class="arrow" aria-hidden="true">&rarr;</span></span></div></a>';
    };
    if (evSlug) {
      q("[data-events-list]").hidden = true;
      var evHero = document.querySelector(".hero"); if (evHero) evHero.hidden = true;
      fetch("/api/events/" + encodeURIComponent(evSlug)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (ev) {
        var f = function (k) { return evPage.querySelector('[data-ef="' + k + '"]'); };
        document.title = ev.title + " | Skills College";
        setMeta(ev.title + " | Skills College", ev.summary, "/about/events/?event=" + encodeURIComponent(ev.slug));
        f("type").textContent = ev.type; f("title").textContent = ev.title;
        var ICON = {
          date: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
          time: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
          place: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>'
        };
        f("facts").innerHTML = (ev.date ? "<li>" + ICON.date + "<span>" + esc(fmtDate(ev.date)) + "</span></li>" : "") + (ev.time ? "<li>" + ICON.time + "<span>" + esc(ev.time) + "</span></li>" : "") + (ev.location ? "<li>" + ICON.place + "<span>" + esc(ev.location) + "</span></li>" : "");
        f("summary").textContent = ev.summary || ""; f("summary").hidden = !ev.summary || !!ev.body;
        if (ev.cover) { f("cover").src = ev.cover; f("cover").alt = ev.coverAlt || ev.title; f("cover-wrap").hidden = false; }
        f("body").innerHTML = ev.body || (ev.summary ? "<p>" + esc(ev.summary) + "</p>" : "");
        var pics = ev.gallery || [];
        if (pics.length) {
          f("gallery-count").textContent = pics.length + (pics.length === 1 ? " photo" : " photos") + " from the day. Select a photo to enlarge it.";
          f("gallery").innerHTML = pics.map(function (g, i) { return '<button type="button" data-i="' + i + '" aria-label="Open photo ' + (i + 1) + '"><img src="' + esc(g) + '" alt="Photo ' + (i + 1) + " from " + esc(ev.title) + '" loading="lazy"></button>'; }).join("");
          f("gallery-wrap").hidden = false;
          var lb = document.querySelector("[data-lightbox]"), cur = 0;
          var show = function (i) { cur = (i + pics.length) % pics.length; lb.querySelector("img").src = pics[cur]; lb.querySelector("img").alt = "Photo " + (cur + 1) + " from " + ev.title; lb.querySelector("[data-lb-count]").textContent = (cur + 1) + " of " + pics.length; };
          f("gallery").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; show(+b.getAttribute("data-i")); lb.showModal ? lb.showModal() : lb.setAttribute("open", ""); });
          lb.querySelector("[data-lb-prev]").onclick = function () { show(cur - 1); };
          lb.querySelector("[data-lb-next]").onclick = function () { show(cur + 1); };
          lb.querySelector("[data-lb-close]").onclick = function () { lb.close ? lb.close() : lb.removeAttribute("open"); };
          lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
        }
        q("[data-event-detail]").hidden = false;
      }).catch(function () { q("[data-events-list]").hidden = false; if (evHero) evHero.hidden = false; });
    }
    if (!evSlug) fetch("/api/events").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      if (!list || !list.length) return;
      q("[data-events-empty]").hidden = true;
      var up = list.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      var past = list.filter(function (e) { return e.date < today; });
      if (up.length) { q("[data-upcoming-items]").innerHTML = up.map(card).join(""); q("[data-upcoming]").hidden = false; }
      if (past.length) { q("[data-past-items]").innerHTML = past.map(card).join(""); q("[data-past]").hidden = false; }
      var types = []; list.forEach(function (e) { if (types.indexOf(e.type) < 0) types.push(e.type); });
      if (types.length > 1) {
        var chips = q("[data-event-chips]");
        chips.innerHTML = ['All events'].concat(types).map(function (t, i) { return '<button class="chip" type="button" aria-pressed="' + (i === 0) + '">' + esc(t) + "</button>"; }).join("");
        chips.hidden = false;
        chips.addEventListener("click", function (e) {
          var b = e.target.closest(".chip"); if (!b) return;
          chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
          var t = b.textContent;
          evPage.querySelectorAll(".event-card").forEach(function (c) { c.hidden = t !== "All events" && c.getAttribute("data-type") !== t; });
          ["[data-upcoming]", "[data-past]"].forEach(function (sel) { var g = q(sel); if (!g.querySelector(".event-card")) return; g.hidden = !g.querySelector(".event-card:not([hidden])"); });
        });
      }
    }).catch(function () {});
  }
  /* ---------- Meet the team (profiles managed in the portal) ---------- */
  var teamPage = document.querySelector("[data-team-page]");
  if (teamPage) {
    var initials = function (n) { return String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(""); };
    var person = function (p) {
      return '<article class="team-card" data-dept="' + esc(p.department) + '">' +
        '<div class="team-photo">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<span class="initials" aria-hidden="true">' + esc(initials(p.name)) + "</span>") + "</div>" +
        '<div class="team-body"><h3>' + esc(p.name) + "</h3>" + (p.role ? '<p class="team-role">' + esc(p.role) + "</p>" : "") +
        (p.department ? '<span class="team-dept">' + esc(p.department) + "</span>" : "") + (p.bio ? '<p class="team-bio">' + esc(p.bio) + "</p>" : "") +
        ((p.linkedin || p.email) ? '<div class="team-links">' + (p.linkedin ? '<a href="' + esc(p.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>' : "") + (p.email ? '<a href="mailto:' + esc(p.email) + '">Email</a>' : "") + "</div>" : "") +
        "</div></article>";
    };
    var LI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H9z"/></svg>';
    var MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    var leader = function (p) {
      var paras = String(p.bio || "").split(/\n\s*\n|\n/).filter(function (t) { return t.trim(); }).map(function (t) { return "<p>" + esc(t.trim()) + "</p>"; }).join("");
      return '<article class="leader">' +
        '<div class="leader-photo">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name + (p.role ? ", " + p.role : "")) + '">' : '<span class="initials" aria-hidden="true">' + esc(initials(p.name)) + "</span>") + "</div>" +
        '<div class="leader-body">' + (p.role ? '<p class="leader-role">' + esc(p.role) + "</p>" : "") + "<h3>" + esc(p.name) + "</h3>" +
        '<div class="leader-bio">' + paras + "</div>" +
        ((p.linkedin || p.email) ? '<div class="leader-links">' +
          (p.linkedin ? '<a class="btn btn-outline btn-sm" href="' + esc(p.linkedin) + '" target="_blank" rel="noopener">' + LI + " LinkedIn</a>" : "") +
          (p.email ? '<a class="btn btn-outline btn-sm" href="mailto:' + esc(p.email) + '">' + MAIL + " " + esc(p.email) + "</a>" : "") + "</div>" : "") +
        "</div></article>";
    };
    fetch("/api/team/groups").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (groups) {
      if (!groups || !groups.length) return;
      var box = teamPage.querySelector("[data-team-groups]");
      box.classList.toggle("single", groups.length === 1);
      box.innerHTML = groups.map(function (g) {
        return '<figure class="group-photo"><div class="gp-img"><img src="' + esc(g.photo) + '" alt="' + esc(g.alt || g.title) + '" loading="lazy"></div>' +
          '<figcaption><h3>' + esc(g.title) + "</h3>" + (g.caption ? "<p>" + esc(g.caption) + "</p>" : "") + "</figcaption></figure>";
      }).join("");
      teamPage.querySelector("[data-team-groups-wrap]").hidden = false;
      teamPage.querySelector("[data-team-empty]").hidden = true;
    }).catch(function () {});
    fetch("/api/team").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (all) {
      if (!all || !all.length) return;
      teamPage.querySelector("[data-team-empty]").hidden = true;
      var leaders = all.filter(function (p) { return p.featured; }), team = all.filter(function (p) { return !p.featured; });
      if (leaders.length) { teamPage.querySelector("[data-team-leaders]").innerHTML = leaders.map(leader).join(""); teamPage.querySelector("[data-team-leaders-wrap]").hidden = false; }
      if (!team.length) { teamPage.querySelector("[data-team-rest]").closest(".section").hidden = true; return; }
      var grid = teamPage.querySelector("[data-team-items]");
      grid.innerHTML = team.map(person).join("");
      var depts = []; team.forEach(function (p) { if (p.department && depts.indexOf(p.department) < 0) depts.push(p.department); });
      if (depts.length > 1) {
        var chips = teamPage.querySelector("[data-team-chips]");
        chips.innerHTML = ["Everyone"].concat(depts).map(function (d, i) { return '<button class="chip" type="button" aria-pressed="' + (i === 0) + '">' + esc(d) + "</button>"; }).join("");
        chips.hidden = false;
        chips.addEventListener("click", function (e) {
          var b = e.target.closest(".chip"); if (!b) return;
          chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
          grid.querySelectorAll(".team-card").forEach(function (c) { c.hidden = b.textContent !== "Everyone" && c.getAttribute("data-dept") !== b.textContent; });
        });
      }
    }).catch(function () {});
  }
  /* ---------- Cookie consent ---------- */
  var CONSENT_KEY = "sc-consent", cookieBar = document.querySelector("[data-cookie-banner]");
  var readConsent = function () {
    try { var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); if (c && Date.now() - c.at < 365 * 864e5) return c; } catch (e) {}
    return null;
  };
  window.scConsent = { has: function (k) { var c = readConsent(); return !!(c && c[k]); } };
  var saveConsent = function (all) {
    var c = { necessary: true, analytics: !!all, at: Date.now() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) {}
    if (cookieBar) cookieBar.hidden = true;
    document.dispatchEvent(new CustomEvent("sc:consent", { detail: c }));
  };
  if (cookieBar) {
    if (!readConsent()) cookieBar.hidden = false;
    cookieBar.addEventListener("click", function (e) { var b = e.target.closest("[data-consent]"); if (b) saveConsent(b.getAttribute("data-consent") === "all"); });
  }
  document.querySelectorAll("[data-cookie-settings]").forEach(function (b) {
    b.addEventListener("click", function () { if (cookieBar) { cookieBar.hidden = false; var f = cookieBar.querySelector("button"); if (f) f.focus(); } });
  });
})();
