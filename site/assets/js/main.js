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
      "qcto": "QCTO qualifications", "qcto-qualification": "QCTO qualifications", "qcto-assessment": "QCTO assessment",
      "strategy": "Skills Development Strategy", "learnerships": "Learnerships & Internships",
      "bursaries": "Higher Education Bursaries", "ignite": "Ignite Bursaries",
      "disability": "Disability Skills Development", "absorption": "B-BBEE Absorption",
      "training": "Accredited Training", "b-bbee": "B-BBEE scorecard advice", "events": "Events",
      "yes": "YES programme", "esd": "Enterprise, supplier and socio-economic development", "certificate": "Certificates and accreditation", "general": "General enquiry"
    };
    var topic = params.get("topic"), intent = params.get("intent"), about = (params.get("q") || "").slice(0, 150);
    if (topic === "qcto" && intent === "assessment") topic = "qcto-assessment";
    var select = form.querySelector("#interest");
    if (topic && topicMap[topic] && select) select.value = topicMap[topic];
    var note = form.parentNode.querySelector("[data-topic-note]");
    if (note && select && select.value) { note.textContent = "Your enquiry is about: " + select.value + (about ? " (" + about + ")" : "") + ". You can change this below."; note.hidden = false; }
    var msg = form.querySelector("#message");
    if (about && msg && !msg.value) msg.value = "I would like more information about " + about + ".";
    var source = form.querySelector("#source-page");
    if (source) source.value = (topic ? "topic=" + topic + " | " : "") + (intent ? "intent=" + intent + " | " : "") + (about ? "item=" + about + " | " : "") + (document.referrer || "direct");

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
    articles: function (a) {
      var href = a.url || ("/resources/article/?slug=" + encodeURIComponent(a.slug));
      return '<article class="photo-card article-card" data-category="' + esc(a.category) + '" style="position:relative">' +
        (a.cover ? '<img src="' + esc(a.cover) + '" alt="' + esc(a.coverAlt || a.title) + '" loading="lazy">' : "") +
        '<div class="body"><p class="meta"><span class="cat">' + esc(a.category) + '</span> &middot; ' + esc(fmtDate(a.date)) + '</p>' +
        '<h3>' + esc(a.title) + '</h3><p>' + esc(a.summary) + '</p>' +
        '<a class="text-link stretched" href="' + esc(href) + '">Read article <span class="arrow" aria-hidden="true">&rarr;</span></a></div></article>';
    }
  };
  renderers.cases = renderers.articles;
  var CASE_CAT = "Case Studies & Impact";
  var postsPromise = null;
  function getPosts() {
    if (!postsPromise) postsPromise = fetch("/api/posts").then(function (r) { if (!r.ok) throw new Error("posts"); return r.json(); });
    return postsPromise;
  }

  /* ---------- Article lists (Resources, Case studies) with loading, error, filter and empty states ---------- */
  document.querySelectorAll("[data-collection]").forEach(function (box) {
    var name = box.getAttribute("data-collection");
    var list = box.querySelector("[data-items]");
    var empty = box.querySelector("[data-empty]");
    var status = document.createElement("p");
    status.className = "results-count"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    status.textContent = "Loading articles…";
    box.insertBefore(status, box.firstChild);
    if (empty) empty.hidden = true;
    getPosts().then(function (posts) {
      var items = (Array.isArray(posts) ? posts : []).filter(function (p) { return name === "cases" ? p.category === CASE_CAT : true; });
      box.__items = items;
      if (!items.length) { status.textContent = ""; if (empty) empty.hidden = false; return; }
      list.innerHTML = items.map(renderers[name]).join("");
      list.hidden = false;
      status.textContent = items.length + (items.length === 1 ? " article" : " articles");
      box.dispatchEvent(new CustomEvent("collection:ready"));
    }).catch(function () {
      status.textContent = "Articles could not be loaded right now. Please refresh the page or try again later.";
    });
  });

  /* Resources category chips: count, "no articles in this topic" message and reset */
  var chipWrap = document.querySelector("[data-chips]");
  var artBox = document.querySelector('[data-collection="articles"]');
  if (chipWrap && artBox) {
    var none = document.createElement("div");
    none.className = "events-empty"; none.hidden = true;
    none.innerHTML = '<h3>No articles in this topic yet</h3><p>Choose another topic or <button type="button" class="link-like text-underline" data-chip-reset>show all articles</button>.</p>';
    artBox.appendChild(none);
    var applyChip = function (cat) {
      var cards = artBox.querySelectorAll(".article-card"), n = 0;
      cards.forEach(function (card) { var show = !cat || card.getAttribute("data-category") === cat; card.hidden = !show; if (show) n++; });
      var st = artBox.querySelector(".results-count");
      if (st && artBox.__items && artBox.__items.length) st.textContent = (cat ? n + " of " + cards.length : n) + (n === 1 ? " article" : " articles") + (cat ? " in " + cat : "");
      none.hidden = !(artBox.__items && artBox.__items.length) || n > 0;
    };
    chipWrap.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      var on = chip.getAttribute("aria-pressed") !== "true";
      chipWrap.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      applyChip(on ? chip.textContent.trim() : null);
      var target = document.getElementById("latest"); if (target && on) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    none.addEventListener("click", function (e) {
      if (!e.target.closest("[data-chip-reset]")) return;
      chipWrap.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      applyChip(null);
    });
  }

  /* Case Studies link in the About menu appears once a case study is published */
  var needsCases = document.querySelectorAll("[data-needs-cases]");
  if (needsCases.length) getPosts().then(function (posts) {
    if ((posts || []).some(function (p) { return p.category === CASE_CAT; })) needsCases.forEach(function (el) { el.hidden = false; });
  }).catch(function () {});

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
        var cb = document.querySelector("[data-cta-btn]"); cb.href = "/learners/opportunities/"; cb.firstChild.textContent = "Find opportunities ";
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
    var evStatus = q("[data-events-status]");
    if (!evSlug) fetch("/api/events").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      if (evStatus) evStatus.textContent = "";
      if (!list || !list.length) { q("[data-events-empty]").hidden = false; return; }
      var up = list.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      var past = list.filter(function (e) { return e.date < today; });
      q("[data-upcoming]").hidden = false;
      if (up.length) q("[data-upcoming-items]").innerHTML = up.map(card).join("");
      else q("[data-upcoming-items]").innerHTML = '<p class="events-none">There are no upcoming events at the moment. Highlights from recent events are below.</p>';
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
    }).catch(function () { if (evStatus) evStatus.textContent = "Events could not be loaded right now. Please refresh the page or try again later."; });
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
  /* ---------- Learner opportunities (managed in the portal) ---------- */
  var oppPage = document.querySelector("[data-opps-page]");
  if (oppPage) {
    var oq = function (sel) { return oppPage.querySelector(sel); };
    var oppId = new URLSearchParams(location.search).get("id");
    var todayIso = new Date().toISOString().slice(0, 10);
    var closed = function (o) { return o.closingDate && o.closingDate < todayIso; };
    var oppCard = function (o) {
      return '<article class="opp-card' + (closed(o) ? " is-closed" : "") + '" data-type="' + esc(o.type) + '" data-loc="' + esc(o.location) + '">' +
        '<div class="opp-top"><span class="pill-cat">' + esc(o.type) + "</span>" + (closed(o) ? '<span class="pill closed">Closed</span>' : (o.closingDate ? '<span class="pill">Closes ' + esc(fmtDate(o.closingDate)) + "</span>" : '<span class="pill">Open</span>')) + "</div>" +
        "<h3>" + esc(o.title) + "</h3>" + (o.location ? '<p class="meta">' + esc(o.location) + (o.duration ? " &middot; " + esc(o.duration) : "") + "</p>" : "") +
        (o.summary ? "<p>" + esc(o.summary) + "</p>" : "") +
        '<a class="text-link stretched" href="/learners/opportunities/?id=' + encodeURIComponent(o.id) + '">View ' + esc(o.title) + ' <span class="arrow" aria-hidden="true">&rarr;</span></a></article>';
    };
    if (oppId) {
      oq("[data-opps-list]").hidden = true;
      var oh = document.querySelector(".hero"); if (oh) oh.hidden = true;
      fetch("/api/opportunities/" + encodeURIComponent(oppId)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (o) {
        var f = function (k) { return oppPage.querySelector('[data-of="' + k + '"]'); };
        document.title = o.title + " | Skills College";
        setMeta(o.title + " | Skills College", o.summary, "/learners/opportunities/?id=" + encodeURIComponent(o.id));
        f("type").textContent = o.type; f("title").textContent = o.title; f("summary").textContent = o.summary || ""; f("summary").hidden = !o.summary;
        var facts = [["Location", o.location], ["Closing date", o.closingDate ? fmtDate(o.closingDate) + (closed(o) ? " (closed)" : "") : "Open until filled"], ["Starts", o.startDate ? fmtDate(o.startDate) : ""], ["Duration", o.duration], ["Stipend", o.stipend]].filter(function (x) { return x[1]; });
        f("facts").innerHTML = facts.slice(0, 3).map(function (x) { return "<li><span><strong>" + esc(x[0]) + ":</strong> " + esc(x[1]) + "</span></li>"; }).join("");
        f("keyfacts").innerHTML = facts.map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("");
        f("description").innerHTML = o.description || ""; /* cleaned on the server */
        [["eligibility", "li"], ["documents", "li"], ["selection", "li"]].forEach(function (k) {
          var arr = o[k[0]] || [];
          if (arr.length) { f(k[0]).innerHTML = arr.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); f(k[0] + "-wrap").hidden = false; }
        });
        var apply = "";
        if (closed(o)) apply = '<p class="pill closed">Applications for this opportunity have closed.</p>';
        else if (o.applyUrl) apply = '<a class="btn btn-orange" href="' + esc(o.applyUrl) + '"' + (/^https?:/.test(o.applyUrl) ? ' target="_blank" rel="noopener"' : "") + ">Apply now <span class=\"arrow\" aria-hidden=\"true\">&rarr;</span></a>";
        else if (o.applyEmail) apply = '<p>Email your application and documents to:</p><p><a class="email-big" href="mailto:' + esc(o.applyEmail) + "?subject=" + encodeURIComponent("Application: " + o.title) + '">' + esc(o.applyEmail) + "</a></p>";
        else apply = '<p>Contact our recruitment team to apply: <a href="tel:+27824875996">082 487 5996</a> or <a href="mailto:recruitment@skillscollege.co.za">recruitment@skillscollege.co.za</a>.</p>';
        if (o.contact) apply += '<p class="small muted">Questions: ' + esc(o.contact) + "</p>";
        f("apply").innerHTML = apply;
        oq("[data-opp-detail]").hidden = false;
      }).catch(function () {
        oq("[data-opps-list]").hidden = false; if (oh) oh.hidden = false;
        oq("[data-opp-count]").textContent = "That opportunity is no longer available. Browse the current opportunities below.";
        loadOpps();
      });
    } else loadOpps();
    function loadOpps() {
      var params = new URLSearchParams(location.search);
      fetch("/api/opportunities").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
        var grid = oq("[data-opps]"), count = oq("[data-opp-count]");
        if (!list.length) { count.textContent = ""; oq("[data-opp-empty]").hidden = false; oq("[data-opp-filters]").hidden = true; return; }
        list.sort(function (a, b) { return (closed(a) - closed(b)) || String(a.closingDate || "9999").localeCompare(String(b.closingDate || "9999")); });
        grid.innerHTML = list.map(oppCard).join("");
        var types = [], locs = [];
        list.forEach(function (o) { if (o.type && types.indexOf(o.type) < 0) types.push(o.type); if (o.location && locs.indexOf(o.location) < 0) locs.push(o.location); });
        var ts = oq("#opp-type"), ls = oq("#opp-loc");
        types.sort().forEach(function (t) { ts.insertAdjacentHTML("beforeend", "<option>" + esc(t) + "</option>"); });
        locs.sort().forEach(function (t) { ls.insertAdjacentHTML("beforeend", "<option>" + esc(t) + "</option>"); });
        if (params.get("type")) ts.value = params.get("type");
        var applyF = function () {
          var q = oq("#opp-q").value.toLowerCase().trim(), t = ts.value, l = ls.value, n = 0;
          grid.querySelectorAll(".opp-card").forEach(function (c, i) {
            var o = list[i], txt = (o.title + " " + o.summary + " " + o.location + " " + o.type).toLowerCase();
            var show = (!t || o.type === t) && (!l || o.location === l) && (!q || txt.indexOf(q) > -1);
            c.hidden = !show; if (show) n++;
          });
          var open = list.filter(function (o) { return !closed(o); }).length;
          count.textContent = n + " of " + list.length + " opportunit" + (list.length === 1 ? "y" : "ies") + " shown" + (open < list.length ? " (" + open + " open)" : "");
          oq("[data-opp-none]").hidden = n > 0;
        };
        oq("[data-opp-filters]").addEventListener("input", applyF);
        oq("[data-opp-filters]").addEventListener("submit", function (e) { e.preventDefault(); applyF(); });
        oq("[data-opp-reset]").addEventListener("click", function () { oq("[data-opp-filters]").reset(); applyF(); });
        applyF();
      }).catch(function () { oq("[data-opp-count]").textContent = "Opportunities could not be loaded right now. Please refresh the page, or contact recruitment on 082 487 5996."; });
    }
  }

  /* ---------- QCTO qualification directory (managed in the portal) ---------- */
  var qualPage = document.querySelector("[data-quals-page]");
  if (qualPage) {
    var qq = function (sel) { return qualPage.querySelector(sel); };
    fetch("/api/qualifications").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      var box = qq("[data-quals]"), count = qq("[data-qual-count]");
      if (!list.length) { count.textContent = ""; qq("[data-qual-empty]").hidden = false; qq("[data-qual-filters]").hidden = true; return; }
      box.innerHTML = list.map(function (q) {
        var dl = [["Qualification ID", q.qualId], ["NQF level", q.nqf], ["Credits", q.credits], ["Duration", q.duration], ["Delivery", [q.mode, q.delivery].filter(Boolean).join(", ")], ["Entry requirements", q.entry], ["SETA / quality partner", q.seta], ["Scope", q.scope]]
          .filter(function (x) { return x[1]; }).map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("");
        return '<article class="qual-card"><div class="qual-top"><span class="pill-cat">' + esc(q.type) + '</span><span class="pill avail-' + esc(String(q.availability).toLowerCase().replace(/[^a-z]+/g, "-")) + '">' + esc(q.availability) + "</span></div>" +
          "<h3>" + esc(q.title) + "</h3>" + (q.sector ? '<p class="meta">' + esc(q.sector) + "</p>" : "") + (q.summary ? "<p>" + esc(q.summary) + "</p>" : "") +
          '<dl class="qual-facts">' + dl + "</dl>" +
          '<a class="text-link" href="/contact/?topic=qcto-qualification&amp;q=' + encodeURIComponent(q.title) + '#enquiry">Enquire about ' + esc(q.title) + ' <span class="arrow" aria-hidden="true">&rarr;</span></a></article>';
      }).join("");
      var add = function (sel, vals) { vals.forEach(function (v) { qq(sel).insertAdjacentHTML("beforeend", "<option>" + esc(v) + "</option>"); }); };
      var uniq = function (k) { var o = []; list.forEach(function (q) { if (q[k] && o.indexOf(q[k]) < 0) o.push(q[k]); }); return o.sort(function (a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); }); };
      add("#q-nqf", uniq("nqf")); add("#q-type", uniq("type")); add("#q-avail", uniq("availability"));
      var applyQ = function () {
        var t = qq("#q-q").value.toLowerCase().trim(), nqf = qq("#q-nqf").value, ty = qq("#q-type").value, av = qq("#q-avail").value, n = 0;
        box.querySelectorAll(".qual-card").forEach(function (c, i) {
          var q = list[i], txt = (q.title + " " + q.qualId + " " + q.sector + " " + q.summary).toLowerCase();
          var show = (!t || txt.indexOf(t) > -1) && (!nqf || q.nqf === nqf) && (!ty || q.type === ty) && (!av || q.availability === av);
          c.hidden = !show; if (show) n++;
        });
        count.textContent = n + " of " + list.length + (list.length === 1 ? " qualification" : " qualifications") + " shown";
        qq("[data-qual-none]").hidden = n > 0;
      };
      qq("[data-qual-filters]").addEventListener("input", applyQ);
      qq("[data-qual-filters]").addEventListener("submit", function (e) { e.preventDefault(); applyQ(); });
      qq("[data-qual-reset]").addEventListener("click", function () { qq("[data-qual-filters]").reset(); applyQ(); });
      applyQ();
    }).catch(function () { qq("[data-qual-count]").textContent = "The directory could not be loaded right now. Please refresh the page or ask our team."; });
  }

  /* ---------- Home: partner badges and client testimonials (managed in the portal) ---------- */
  var partnersSec = document.querySelector("[data-partners]");
  if (partnersSec) {
    fetch("/api/partners").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      if (!list.length) return;
      var track = partnersSec.querySelector("[data-partner-track]");
      var badge = function (p, dup) {
        var img = '<img src="' + esc(p.logo) + '" alt="' + (dup ? "" : esc(p.title)) + '" loading="lazy">';
        var inner = p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener"' + (dup ? ' tabindex="-1"' : "") + ">" + img + "</a>" : img;
        return '<li class="partner-badge"' + (dup ? ' aria-hidden="true"' : "") + (p.note && !dup ? ' title="' + esc(p.note) + '"' : "") + ">" + inner + "</li>";
      };
      var html = list.map(function (p) { return badge(p, false); }).join("");
      var pause = partnersSec.querySelector("[data-partner-pause]");
      if (list.length < 4) { track.classList.add("static"); track.innerHTML = html; if (pause) pause.parentNode.hidden = true; }
      else {
        // the list is repeated once so the loop is seamless; the copy is hidden from screen readers
        track.innerHTML = html + list.map(function (p) { return badge(p, true); }).join("");
        track.style.setProperty("--partner-speed", Math.max(20, list.length * 5) + "s");
        pause.addEventListener("click", function () {
          var c = partnersSec.querySelector("[data-partner-carousel]"), on = c.classList.toggle("paused");
          pause.textContent = on ? "Play" : "Pause"; pause.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      partnersSec.hidden = false;
    }).catch(function () {});
  }
  var testiSec = document.querySelector("[data-testimonials]");
  if (testiSec) {
    fetch("/api/testimonials").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      if (!list.length) return;
      list = list.slice(0, 6);
      var grid = testiSec.querySelector("[data-testimonial-items]");
      grid.classList.add("count-" + Math.min(list.length, 3));
      grid.innerHTML = list.map(function (t) {
        var who = [t.role, t.company].filter(Boolean).join(", ");
        return '<figure class="testimonial"><blockquote><p>' + esc(t.quote) + "</p></blockquote><figcaption>" +
          (t.photo ? '<img src="' + esc(t.photo) + '" alt="" loading="lazy">' : "") +
          "<div>" + (t.name ? "<strong>" + esc(t.name) + "</strong>" : "") + (who ? "<span>" + esc(who) + "</span>" : "") + "</div></figcaption></figure>";
      }).join("");
      testiSec.hidden = false;
    }).catch(function () {});
  }

  /* ---------- Certificates and documents (managed in the portal) ---------- */
  document.querySelectorAll("[data-docs-page]").forEach(function (wrap) {
    var cats = (wrap.getAttribute("data-doc-cats") || "").split(",");
    var status = wrap.querySelector("[data-doc-status]"), box = wrap.querySelector("[data-docs]");
    var kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; };
    fetch("/api/documents").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      list = list.filter(function (d) { return cats.indexOf(d.category) > -1; });
      status.textContent = "";
      if (!list.length) { wrap.querySelector("[data-doc-empty]").hidden = false; return; }
      var today = new Date().toISOString().slice(0, 10);
      box.innerHTML = list.map(function (d) {
        var expired = d.expires && d.expires < today;
        return '<article class="doc-card' + (expired ? " expired" : "") + '"><div class="doc-icon" aria-hidden="true">PDF</div><div class="doc-body">' +
          '<span class="pill-cat">' + esc(d.category) + "</span><h3>" + esc(d.title) + "</h3>" +
          '<dl class="doc-facts">' + (d.issuer ? "<dt>Issued by</dt><dd>" + esc(d.issuer) + "</dd>" : "") + (d.scope ? "<dt>Scope</dt><dd>" + esc(d.scope) + "</dd>" : "") +
          (d.issued || d.expires ? "<dt>Valid</dt><dd>" + (d.issued ? esc(fmtDate(d.issued)) : "") + (d.expires ? " to " + esc(fmtDate(d.expires)) : "") + (expired ? " (expired: a renewed copy is available on request)" : "") + "</dd>" : "") + "</dl>" +
          (d.note ? '<p class="small muted">' + esc(d.note) + "</p>" : "") + "</div>" +
          '<a class="btn btn-outline btn-sm" href="' + esc(d.file) + '" target="_blank" rel="noopener">Download ' + esc(d.title) + " (PDF" + (d.size ? ", " + kb(d.size) : "") + ")</a></article>";
      }).join("");
    }).catch(function () { status.textContent = ""; wrap.querySelector("[data-doc-empty]").hidden = false; });
  });
})();
