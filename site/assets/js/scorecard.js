/* Skills College B-BBEE scorecard calculator
   Indicative only. Based on the Amended Codes of Good Practice (2013, amended May 2019) and the QSE scorecard. */
(function () {
  "use strict";
  var form = document.querySelector("[data-calc]");
  if (!form) return;
  var resultBox = document.querySelector("[data-result]");
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) {
    var el = $(id); if (!el) return 0;
    var raw = String(el.value).replace(/[R%\s]/g, "");
    raw = /^\d+,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
    var v = parseFloat(raw);
    return isFinite(v) && v > 0 ? v : 0;
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (v) { return "R" + Math.round(v).toLocaleString("en-ZA"); };
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  // points earned against a target, capped at the weighting
  var score = function (actual, target, weight) { return target > 0 ? Math.min(weight, Math.max(0, actual / target * weight)) : 0; };

  /* ---------- thresholds by sector (EME max, QSE max) ---------- */
  var THRESHOLDS = {
    generic: [10e6, 50e6], tourism: [5e6, 45e6], construction: [10e6, 50e6], bep: [6e6, 25e6], financial: [10e6, 50e6], ict: [10e6, 50e6]
  };
  var SECTOR_NOTES = {
    tourism: "Tourism Sector Code applies: thresholds used are EME up to R5m and QSE up to R45m. Element weightings and targets differ from the Generic Codes; our team will confirm your score on the Tourism scorecard.",
    construction: "Construction Sector Code applies (contractors). Element targets differ from the Generic Codes; our team will confirm your score on the Construction scorecard.",
    bep: "Construction Sector Code applies (built environment professionals): EME up to R6m and QSE up to R25m. Targets differ; our team will confirm.",
    financial: "Financial Sector Code applies. It adds Access to Financial Services and Empowerment Financing elements, so this Generic estimate is a guide only.",
    ict: "ICT Sector Code applies. Weightings and targets differ from the Generic Codes; our team will confirm your score on the ICT scorecard.",
    mac: "MAC Sector Code applies. Thresholds vary by sub-sector, so this estimate uses the Generic thresholds and scorecards.",
    agri: "AgriBEE Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    property: "Property Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    forest: "Forest Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    transport: "A Transport Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    ca: "Chartered Accountancy Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    defence: "Defence Sector Code applies. This estimate uses the Generic thresholds and scorecards; our team will confirm.",
    mining: "Mining companies are measured under the Mining Charter, not the B-BBEE Codes. This estimate shows how you would score on the Generic Codes only.",
    unsure: "You were not sure about your sector code. Our team will check whether a sector code applies to you."
  };
  var LEVELS = [[100, "Level 1", "135%"], [95, "Level 2", "125%"], [90, "Level 3", "110%"], [80, "Level 4", "100%"], [75, "Level 5", "80%"], [70, "Level 6", "60%"], [55, "Level 7", "50%"], [40, "Level 8", "10%"], [-1, "Non-compliant", "0%"]];
  var levelIndex = function (pts) { for (var i = 0; i < LEVELS.length; i++) if (pts >= LEVELS[i][0]) return i; return LEVELS.length - 1; };
  var GRAD = { 1: 0.1, 2: 0.2, 3: 0.4, 4: 0.6, 5: 0.8, 6: 1 };

  /* ---------- category ---------- */
  function category() {
    var sector = $("sector").value;
    var t = THRESHOLDS[sector] || THRESHOLDS.generic;
    var turnover = num("turnover"), black = Math.min(100, num("own_black"));
    var cat = turnover <= t[0] ? "EME" : turnover <= t[1] ? "QSE" : "Generic";
    var auto = null;
    if (cat === "EME") {
      if (sector === "construction") auto = black >= 100 ? 0 : black >= 51 ? 1 : black >= 30 ? 3 : 4;
      else auto = black >= 100 ? 0 : black >= 51 ? 1 : 3;
    } else if (cat === "QSE") {
      if (black >= 100) auto = 0; else if (black >= 51) auto = 1;
    }
    return { cat: cat, auto: auto, turnover: turnover, black: black, sector: sector, t: t };
  }

  function showCategory() {
    var box = form.querySelector("[data-category-box]"), wrap = form.querySelector("[data-full-wrap]");
    if (!num("turnover")) { box.hidden = true; wrap.hidden = true; return; }
    var c = category();
    var label = { EME: "Exempted Micro Enterprise (EME)", QSE: "Qualifying Small Enterprise (QSE)", Generic: "Generic (large) entity" }[c.cat];
    var txt = "<strong>" + label + "</strong>";
    if (c.auto !== null) txt += "<span>You qualify for an automatic <b>" + LEVELS[c.auto][1] + "</b> with a sworn affidavit. You can skip the detailed scorecard.</span>";
    else txt += "<span>You will be measured on the <b>" + (c.cat === "QSE" ? "QSE" : "Generic") + " scorecard</b>. The next steps collect the figures for each element.</span>";
    box.innerHTML = txt; box.hidden = false;
    wrap.hidden = c.auto === null;
    applyScorecardFields();
    updateNav();
  }

  function usedCard() {
    if (!num("turnover")) return "generic";
    var c = category();
    if (c.auto !== null && !$("use_full").checked) return "auto";
    return c.cat === "Generic" ? "generic" : "qse";
  }
  function applyScorecardFields() {
    var card = usedCard();
    form.querySelectorAll("[data-only]").forEach(function (el) { el.hidden = card !== "auto" && el.getAttribute("data-only") !== card; });
  }

  /* ---------- scoring ---------- */
  function npatValue(notes) {
    var npat = num("npat");
    if (npat > 0) return npat;
    var deemed = num("turnover") * 0.025;
    if (num("esd_sd") || num("esd_ed") || num("sed")) notes.push("No profit was entered, so a deemed NPAT of 2.5% of turnover (" + money(deemed) + ") was used for NPAT-based targets. Your verification agent will apply your industry norm.");
    return deemed;
  }

  function calc() {
    var c = category(), card = usedCard(), notes = [], els = [];
    var isG = card === "generic";
    if (SECTOR_NOTES[c.sector]) notes.push(SECTOR_NOTES[c.sector]);

    if (card === "auto") {
      var li = c.auto;
      return { c: c, card: "EME/QSE affidavit", total: null, levelIdx: li, discounted: false, els: [], notes: notes.concat([
        c.cat + " with " + c.black + "% black ownership: automatic " + LEVELS[li][1] + " on a sworn affidavit (valid 12 months).",
        c.cat === "EME" && c.black < 51 ? "EMEs that are less than 51% black owned are Level 4 by default. Measuring on the QSE scorecard could improve this." : "Keep your affidavit current and make sure ownership records support it."]) };
    }

    // Ownership
    var ei = num("own_ei"), yrs = +$("own_years").value || 6, paid = $("own_paid").value === "" ? 100 : Math.min(100, num("own_paid"));
    var nv = score(ei * paid / 100, 25 * GRAD[yrs], 8);
    var own = isG
      ? [score(c.black, 25.01, 4), score(num("own_bw"), 10, 2), score(ei, 25, 4), score(num("own_bw_ei"), 10, 2), score(num("own_desig"), 3, 3), score(num("own_new"), 2, 2), nv]
      : [score(c.black, 25.01, 5), score(num("own_bw"), 10, 2), score(ei, 25, 5), score(num("own_bw_ei"), 10, 2), score(Math.max(num("own_desig"), num("own_new")), 2, 3), nv];
    var ownPts = sum(own), ownOK = nv >= 3.2;
    els.push({ key: "own", name: "Ownership", points: ownPts, max: 25, bonus: 0, subMin: ownOK ? "Met" : "Not met", prio: true });
    if (!ownOK) notes.push("Ownership sub-minimum not met: net value earned " + r2(nv) + " of 8 points (minimum 3.2).");

    // Management control
    var mc;
    if (isG) {
      mc = sum([score(num("mc_board"), 50, 2), score(num("mc_board_f"), 25, 1), score(num("mc_exdir"), 50, 2), score(num("mc_exdir_f"), 25, 1),
        score(num("mc_exec"), 60, 2), score(num("mc_exec_f"), 30, 1), score(num("mc_senior"), 60, 2), score(num("mc_senior_f"), 30, 1),
        score(num("mc_middle"), 75, 2), score(num("mc_middle_f"), 38, 1), score(num("mc_junior"), 88, 1), score(num("mc_junior_f"), 44, 1), score(num("mc_dis"), 2, 2)]);
    } else {
      var other = (num("mc_senior") + num("mc_middle") + num("mc_junior")) / 3, otherF = (num("mc_senior_f") + num("mc_middle_f") + num("mc_junior_f")) / 3;
      mc = sum([score(num("mc_exec"), 50, 5), score(num("mc_exec_f"), 25, 2), score(other, 60, 6), score(otherF, 30, 2)]);
    }
    els.push({ key: "mc", name: "Management control", points: mc, max: isG ? 19 : 15, bonus: 0, subMin: "n/a" });

    // Skills development
    var la = num("sd_payroll"), emp = num("sd_emp"), comp = num("sd_completed"), abs = Math.min(num("sd_absorbed"), comp || num("sd_absorbed"));
    var absPts = comp > 0 ? score(abs / comp * 100, 100, 5) : 0, sd;
    if (!la && (num("sd_lp") || num("sd_burs") || num("sd_dis"))) notes.push("Skills spend was entered without a leviable amount (payroll), so spend-based skills points could not be calculated.");
    if (isG) sd = [score(la ? num("sd_lp") / la * 100 : 0, 3.5, 6), score(la ? num("sd_burs") / la * 100 : 0, 2.5, 4), score(la ? num("sd_dis") / la * 100 : 0, 0.3, 4), score(emp ? num("sd_learners") / emp * 100 : 0, 5, 6)];
    else sd = [score(la ? (num("sd_lp") + num("sd_burs")) / la * 100 : 0, 3, 15), score(la ? num("sd_lp_f") / la * 100 : 0, 1, 7), score(la ? num("sd_dis") / la * 100 : 0, 0.15, 3)];
    var sdPts = sum(sd), sdMax = isG ? 20 : 25, sdOK = sdPts >= sdMax * 0.4;
    els.push({ key: "sd", name: "Skills development", points: sdPts, max: sdMax, bonus: absPts, bonusMax: 5, subMin: sdOK ? "Met" : "Not met", prio: true });

    // ESD
    var tmps = num("esd_tmps"), np = npatValue(notes), pp, ppMax, sdv, edv, bon;
    var pc = function (id) { return tmps ? num(id) / tmps * 100 : 0; };
    if (isG) {
      pp = sum([score(pc("esd_all"), 80, 5), score(pc("esd_qse"), 15, 3), score(pc("esd_eme"), 15, 4), score(pc("esd_51"), 50, 11), score(pc("esd_30bw"), 12, 4)]); ppMax = 27;
      sdv = score(num("esd_sd") / np * 100, 2, 10); edv = score(num("esd_ed") / np * 100, 1, 5);
      bon = score(pc("esd_desig"), 2, 2) + ($("esd_grad").checked ? 1 : 0) + ($("esd_jobs").checked ? 1 : 0);
    } else {
      pp = sum([score(pc("esd_all"), 60, 15), score(pc("esd_51"), 15, 5)]); ppMax = 20;
      sdv = score(num("esd_sd") / np * 100, 1, 5); edv = score(num("esd_ed") / np * 100, 1, 5);
      bon = ($("esd_grad").checked ? 1 : 0) + ($("esd_jobs").checked ? 1 : 0);
    }
    var esdMax = isG ? 42 : 30;
    var esdOK = pp >= ppMax * 0.4 && sdv >= (isG ? 4 : 2) && edv >= 2;
    if (!tmps) notes.push("No total measured procurement spend was entered, so preferential procurement scored zero.");
    els.push({ key: "esd", name: "Enterprise and supplier development", points: pp + sdv + edv, max: esdMax, bonus: bon, bonusMax: isG ? 4 : 2, subMin: esdOK ? "Met" : "Not met", prio: true,
      parts: "Preferential procurement " + r2(pp) + "/" + ppMax + ", supplier development " + r2(sdv) + "/" + (isG ? 10 : 5) + ", enterprise development " + r2(edv) + "/5" });

    // SED
    var sedPts = score(num("sed") / np * 100, 1, 5);
    els.push({ key: "sed", name: "Socio-economic development", points: sedPts, max: 5, bonus: 0, subMin: "n/a" });

    var total = sum(els.map(function (x) { return x.points + x.bonus; }));
    var li2 = levelIndex(total), discounted = false;
    var fails = isG ? (!ownOK || !sdOK || !esdOK) : (!ownOK || (!sdOK && !esdOK));
    if (fails && li2 < LEVELS.length - 1) { li2 += 1; discounted = true; }
    if (fails) notes.push(isG ? "A priority element sub-minimum was missed, so the level is discounted by one level." : "QSEs must meet the ownership sub-minimum and at least one of skills development or ESD. This was not met, so the level is discounted by one level.");
    if (!sdOK) notes.push("Skills development is below its 40% sub-minimum. Learnerships, bursaries and disability programmes are the quickest ways to close this gap.");
    if (absPts < 5 && comp) notes.push("Absorbing more learners at the end of their programmes can earn up to 5 bonus points.");
    return { c: c, card: isG ? "Generic scorecard" : "QSE scorecard", total: total, levelIdx: li2, discounted: discounted, els: els, notes: notes, fails: fails };
  }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }

  /* ---------- results ---------- */
  var HELP = {
    sd: ["Learnerships & internships", "/for-employers/learnerships-internships/"],
    own: ["Talk to us about B-BBEE strategy", "/contact/?topic=b-bbee"],
    mc: ["Skills Development Strategy", "/for-employers/skills-development-strategy/"],
    esd: ["Enterprise and supplier development solutions", "/for-employers/#additional-solutions"],
    sed: ["Socio-economic development solutions", "/for-employers/#additional-solutions"]
  };
  function render(res, ref, sent) {
    var L = LEVELS[res.levelIdx];
    var html = '<div class="result-head"><div class="level-badge l' + (res.levelIdx + 1) + '"><small>Indicative level</small><b>' + esc(L[1]) + '</b><span>' + L[2] + ' procurement recognition</span></div><div>' +
      '<p class="eyebrow">' + esc($("company").value) + '</p><h2>Your indicative B-BBEE result</h2>' +
      '<p class="muted">' + esc(res.c.cat === "Generic" ? "Generic (large) entity" : res.c.cat) + " &middot; " + esc(res.card) + (res.total !== null ? " &middot; <strong>" + r2(res.total) + " points</strong>" : "") + (res.discounted ? " &middot; discounted one level" : "") + "</p>";
    if (res.total !== null && res.levelIdx > 0) {
      var next = res.discounted ? null : LEVELS[res.levelIdx - 1];
      if (next) html += '<p class="next-level">You need <strong>' + r2(next[0] - res.total) + " more points</strong> to reach " + next[1] + ".</p>";
    }
    html += "</div></div>";
    if (res.els.length) {
      html += '<div class="table-scroll"><table class="data-table result-table"><thead><tr><th scope="col">Element</th><th scope="col">Points</th><th scope="col">Bonus</th><th scope="col">Sub-minimum</th></tr></thead><tbody>';
      res.els.forEach(function (x) {
        var w = Math.round(Math.min(1, x.points / x.max) * 100);
        html += '<tr><th scope="row">' + esc(x.name) + (x.prio ? ' <span class="badge-prio">Priority</span>' : "") + (x.parts ? '<small class="parts">' + esc(x.parts) + "</small>" : "") +
          '<span class="bar" aria-hidden="true"><i style="width:' + w + '%"></i></span></th><td>' + r2(x.points) + " / " + x.max + "</td><td>" + (x.bonusMax ? r2(x.bonus) + " / " + x.bonusMax : "&mdash;") + "</td><td>" +
          (x.subMin === "n/a" ? "&mdash;" : '<span class="pill ' + (x.subMin === "Met" ? "ok" : "bad") + '">' + x.subMin + "</span>") + "</td></tr>";
      });
      html += '<tr class="total"><th scope="row">Total</th><td colspan="3"><strong>' + r2(res.total) + " points</strong></td></tr></tbody></table></div>";
    }
    if (res.notes.length) html += '<h3 class="mt-m">What this means</h3><ul class="bullets">' + res.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    var seta = $("seta").value;
    if (seta && seta !== "Not sure") html += '<p class="muted small">Your SETA: <strong>' + esc(seta) + "</strong>. Submit your WSP and ATR on time to claim skills development points and the mandatory grant.</p>";
    var gaps = res.els.filter(function (x) { return x.points < x.max * 0.6; }).slice(0, 3);
    if (gaps.length) html += '<h3 class="mt-m">Where we can help</h3><div class="result-help">' + gaps.map(function (g) { var h = HELP[g.key]; return '<a class="card linked" href="' + h[1] + '"><span class="kicker">' + esc(g.name) + "</span><h4>" + esc(h[0]) + '</h4><span class="text-link">Learn more <span class="arrow" aria-hidden="true">&rarr;</span></span></a>'; }).join("") + "</div>";
    html += '<p class="sent ' + (sent ? "ok" : "warn") + '">' + (sent ? "Your results have been sent to the Skills College team" + (ref ? " (reference " + esc(ref) + ")" : "") + ". We will be in touch to talk you through them." : "We could not send your results automatically. Please email them to sales@skillscollege.co.za or call 012 541 0100.") + "</p>";
    html += '<p class="disclaimer">This is an indicative estimate based on the information you entered and the Amended Codes of Good Practice. It is not a B-BBEE certificate or verification.</p>';
    html += '<div class="actions"><a class="btn btn-orange" href="/contact/?topic=b-bbee">Talk to our team <span class="arrow" aria-hidden="true">&rarr;</span></a><button type="button" class="btn btn-outline" data-print>Print or save as PDF</button><button type="button" class="btn btn-outline" data-restart>Edit my answers</button></div>';
    resultBox.innerHTML = html;
    resultBox.hidden = false; form.hidden = true;
    resultBox.querySelector("[data-print]").onclick = function () { window.print(); };
    resultBox.querySelector("[data-restart]").onclick = function () { resultBox.hidden = true; form.hidden = false; go(1); };
    resultBox.focus({ preventScroll: true });
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- sharing results with the sales team ---------- */
  var INPUT_IDS = ["turnover", "own_black", "own_bw", "own_ei", "own_bw_ei", "own_desig", "own_new", "own_years", "own_paid", "mc_board", "mc_board_f", "mc_exdir", "mc_exdir_f", "mc_exec", "mc_exec_f", "mc_senior", "mc_senior_f", "mc_middle", "mc_middle_f", "mc_junior", "mc_junior_f", "mc_dis",
    "sd_payroll", "sd_emp", "sd_lp", "sd_lp_f", "sd_burs", "sd_dis", "sd_learners", "sd_completed", "sd_absorbed", "esd_tmps", "npat", "esd_all", "esd_qse", "esd_eme", "esd_51", "esd_30bw", "esd_desig", "esd_sd", "esd_ed", "sed"];
  function share(res) {
    var L = LEVELS[res.levelIdx], inputs = {};
    INPUT_IDS.forEach(function (id) { var el = $(id); if (el && el.value !== "") inputs[id] = num(id); });
    inputs.esd_grad = $("esd_grad").checked ? "yes" : "no"; inputs.esd_jobs = $("esd_jobs").checked ? "yes" : "no";
    var sectorLabel = $("sector").options[$("sector").selectedIndex].text;
    var payload = {
      company: $("company").value, contact: $("contact").value, email: $("email").value, phone: $("phone").value, role: $("role").value,
      sector: sectorLabel, seta: $("seta").value, turnover: num("turnover"), category: res.c.cat, scorecard: res.card,
      level: L[1], recognition: L[2], points: res.total, discounted: res.discounted,
      elements: res.els.map(function (x) { return { name: x.name, points: r2(x.points), max: x.max, bonus: r2(x.bonus), subMin: x.subMin }; }),
      notes: res.notes, inputs: inputs, consent: $("consent").checked, botField: form.querySelector('[name="bot-field"]').value
    };
    var api = fetch("/api/scorecard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var ref0 = "SC-" + Date.now().toString(36).toUpperCase();
    return api.then(function (out) {
      var ref = (out && out.ref) || ref0;
      var fd = new URLSearchParams();
      fd.append("form-name", "scorecard"); fd.append("bot-field", payload.botField);
      fd.append("reference", ref); fd.append("company", payload.company); fd.append("contact", payload.contact); fd.append("email", payload.email);
      fd.append("phone", payload.phone); fd.append("role", payload.role); fd.append("sector", payload.sector); fd.append("seta", payload.seta);
      fd.append("turnover", money(payload.turnover)); fd.append("category", payload.category); fd.append("scorecard-used", payload.scorecard);
      fd.append("level", payload.level); fd.append("recognition", payload.recognition); fd.append("total-points", payload.points === null ? "Automatic (affidavit)" : String(r2(payload.points)));
      fd.append("discounted", payload.discounted ? "Yes, one level" : "No");
      fd.append("element-breakdown", payload.elements.map(function (x) { return x.name + ": " + x.points + "/" + x.max + (x.bonus ? " + " + x.bonus + " bonus" : "") + (x.subMin !== "n/a" ? " (sub-minimum " + x.subMin.toLowerCase() + ")" : ""); }).join("\n") || "Automatic level on affidavit");
      fd.append("notes", payload.notes.join("\n"));
      fd.append("inputs", Object.keys(inputs).map(function (k) { return k + ": " + inputs[k]; }).join("\n"));
      fd.append("source-page", location.pathname);
      return fetch("/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: fd.toString() })
        .then(function (r) { return { ref: ref, sent: r.ok || !!out }; })
        .catch(function () { return { ref: ref, sent: !!out }; });
    });
  }

  /* ---------- steps ---------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
  var cur = 1;
  var prev = form.querySelector("[data-prev]"), next = form.querySelector("[data-next]"), skipNote = form.querySelector("[data-skip-note]");
  function go(n) {
    cur = n;
    steps.forEach(function (fs) { fs.hidden = +fs.getAttribute("data-step") !== n; });
    form.querySelectorAll(".calc-steps li").forEach(function (li) {
      var s = +li.getAttribute("data-goto");
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      li.classList.toggle("done", s < n);
    });
    prev.hidden = n === 1;
    skipNote.hidden = n === 1;
    updateNav();
    if (n > 1) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function updateNav() {
    var auto = usedCard() === "auto";
    next.innerHTML = (cur === 5 || (cur === 1 && auto)) ? 'See my result <span class="arrow" aria-hidden="true">&rarr;</span>' : 'Next <span class="arrow" aria-hidden="true">&rarr;</span>';
    form.querySelector(".calc-steps").classList.toggle("auto", auto);
  }
  function validStep1() {
    var ok = true;
    ["company", "contact", "email"].forEach(function (id) {
      var el = $(id), bad = !el.value.trim() || (id === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
      el.closest(".field").classList.toggle("invalid", bad); if (bad) ok = false;
    });
    var t = $("turnover"), badT = !num("turnover");
    t.closest(".field").classList.toggle("invalid", badT);
    if (badT) { ok = false; if (!t.closest(".field").querySelector(".form-error")) t.closest(".field").insertAdjacentHTML("beforeend", '<span class="form-error">Enter your annual turnover.</span>'); }
    if (!ok) { var f = form.querySelector(".invalid input, .invalid select"); if (f) f.focus(); }
    return ok;
  }
  var consentBox = function () {
    var ok = $("consent").checked;
    $("consent").closest(".consent").classList.toggle("invalid", !ok);
    form.querySelector("[data-consent-error]").style.display = ok ? "none" : "block";
    return ok;
  };
  function finish() {
    if (!consentBox()) { if (cur !== 5) go(5); $("consent").focus(); return; }
    next.disabled = true; next.textContent = "Calculating...";
    var res = calc();
    share(res).then(function (o) { render(res, o.ref, o.sent); next.disabled = false; go(cur); });
  }
  next.addEventListener("click", function () {
    if (cur === 1) {
      if (!validStep1()) return;
      if (usedCard() === "auto") {
        // auto level: ask for consent inline before sending
        if (!$("consent").checked) { go(5); steps.forEach(function (fs) { fs.hidden = fs.getAttribute("data-step") !== "5"; });
          form.querySelector('fieldset[data-step="5"]').classList.add("consent-only"); next.innerHTML = 'See my result <span class="arrow" aria-hidden="true">&rarr;</span>'; consentBox(); return; }
        return finish();
      }
    }
    if (cur === 5) return finish();
    go(cur + 1);
  });
  prev.addEventListener("click", function () {
    form.querySelector('fieldset[data-step="5"]').classList.remove("consent-only");
    if (cur === 5 && usedCard() === "auto") return go(1);
    go(Math.max(1, cur - 1));
  });
  form.querySelectorAll(".calc-steps li").forEach(function (li) {
    li.addEventListener("click", function () { var s = +li.getAttribute("data-goto"); if (s < cur && s < 6) go(s); });
  });
  ["turnover", "own_black", "sector"].forEach(function (id) { $(id).addEventListener("input", showCategory); $(id).addEventListener("change", showCategory); });
  $("use_full").addEventListener("change", function () { applyScorecardFields(); go(1); });
  $("consent").addEventListener("change", consentBox);
  form.addEventListener("input", function (e) { var f = e.target.closest(".field.invalid"); if (f) f.classList.remove("invalid"); });
  form.addEventListener("submit", function (e) { e.preventDefault(); next.click(); });
  // format money fields on blur
  form.querySelectorAll(".num.has-pre input").forEach(function (inp) {
    if (inp.closest(".num").querySelector(".pre").textContent !== "R") return;
    inp.addEventListener("blur", function () { var v = num(inp.id); inp.value = v ? Math.round(v).toLocaleString("en-ZA") : ""; });
  });
  go(1);
})();
