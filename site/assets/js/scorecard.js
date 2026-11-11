/* Skills College B-BBEE calculator: scorecard category, automatic levels and the Skills Development element
   Indicative only. Based on the Amended Codes of Good Practice (2013, amended May 2019) and the QSE scorecard. */
(function () {
  "use strict";
  var form = document.querySelector("[data-calc]");
  if (!form) return;
  var startedAt = Date.now();
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
    if (c.auto !== null) txt += "<span>You qualify for an automatic <b>" + LEVELS[c.auto][1] + "</b> with a sworn affidavit. You can see your result now, or tick the box below to score your Skills Development as well.</span>";
    else txt += "<span>You will be measured on the <b>" + (c.cat === "QSE" ? "QSE" : "Generic") + " scorecard</b>. The next step scores your Skills Development element.</span>";
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

  /* ---------- scoring: Skills Development element ---------- */
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  var pctTxt = function (v) { return (Math.round(v * 100) / 100) + "%"; };

  function calc() {
    var c = category(), card = usedCard(), notes = [];
    if (SECTOR_NOTES[c.sector]) notes.push(SECTOR_NOTES[c.sector]);
    var res = { c: c, card: card, auto: c.auto, notes: notes, rows: [], sd: null };
    if (c.auto !== null) {
      notes.unshift(c.cat + " with " + c.black + "% black ownership: automatic " + LEVELS[c.auto][1] + " (" + LEVELS[c.auto][2] + " procurement recognition) on a sworn affidavit, valid for 12 months.");
      if (c.cat === "EME" && c.black < 51) notes.push("EMEs that are less than 51% black owned are Level 4 by default. Being measured on the QSE scorecard could improve this, and Skills Development is one of the elements you can control.");
      if (card === "auto") return res;
    }
    var isG = (card === "generic") || (card === "qse" ? false : c.cat === "Generic");
    var la = num("sd_payroll"), emp = num("sd_emp"), comp = num("sd_completed"), abs = Math.min(num("sd_absorbed"), comp || num("sd_absorbed"));
    var lp = num("sd_lp"), burs = num("sd_burs"), dis = num("sd_dis"), lpf = num("sd_lp_f"), learners = num("sd_learners");
    if (!la && (lp || burs || dis)) notes.push("Skills spend was entered without a leviable amount (payroll), so the spend-based points could not be calculated.");
    var spend = function (name, actual, targetPct, pts) {
      var need = la * targetPct / 100, have = la ? actual / la * 100 : 0;
      return { name: name, figure: la ? money(actual) + " (" + pctTxt(have) + ")" : money(actual), target: pctTxt(targetPct) + " of payroll" + (la ? " = " + money(need) : ""),
        points: score(have, targetPct, pts), max: pts, gap: la && actual < need ? money(need - actual) + " more" : (la ? "Target met" : "Enter payroll"), perPoint: la ? need / pts : 0 };
    };
    var rows;
    if (isG) {
      var needL = Math.ceil(emp * 0.05);
      rows = [spend("Learning programmes for black people", lp, 3.5, 6), spend("Bursaries for black students at higher education institutions", burs, 2.5, 4),
        spend("Learning programmes for black employees with disabilities", dis, 0.3, 4),
        { name: "Black people on learnerships, apprenticeships and internships", figure: learners + (emp ? " of " + emp + " employees" : ""), target: "5% of employees" + (emp ? " = " + needL + " people" : ""),
          points: score(emp ? learners / emp * 100 : 0, 5, 6), max: 6, gap: emp ? (learners < needL ? (needL - learners) + " more learner" + (needL - learners === 1 ? "" : "s") : "Target met") : "Enter employees" }];
    } else {
      rows = [spend("Learning programmes for black people (incl. bursaries)", lp + burs, 3, 15), spend("Learning programmes for black women", lpf, 1, 7), spend("Learning programmes for black people with disabilities", dis, 0.15, 3)];
    }
    var sdPts = sum(rows.map(function (r) { return r.points; })), sdMax = isG ? 20 : 25, subMin = sdMax * 0.4, sdOK = sdPts >= subMin - 1e-9;
    var absPts = comp > 0 ? score(abs / comp * 100, 100, 5) : 0;
    rows.push({ name: "Bonus: learners absorbed into employment", figure: comp ? abs + " of " + comp + " completed" : "None entered", target: "100% of learners who complete", points: absPts, max: 5, bonus: true,
      gap: comp ? (abs < comp ? (comp - abs) + " more absorbed" : "Target met") : "Enter completions" });
    res.rows = rows; res.isG = isG;
    res.sd = { points: sdPts, max: sdMax, bonus: absPts, subMin: subMin, ok: sdOK };
    if (!sdOK) {
      // cheapest way to the sub-minimum: top up the main learning programmes indicator first
      var short = subMin - sdPts, main = rows[0], room = main.max - main.points;
      if (la && short <= room + 1e-9) notes.push("You are " + r2(short) + " points below the 40% sub-minimum (" + subMin + " points). About " + money(short * main.perPoint) + " more spent on learning programmes for black people would close the gap.");
      else notes.push("You are " + r2(short) + " points below the 40% sub-minimum (" + subMin + " points). Combining learnerships, bursaries and disability programmes is the quickest way to close the gap.");
      notes.push("Missing the Skills Development sub-minimum drops your overall B-BBEE level by one level" + (isG ? "." : " unless you meet the enterprise and supplier development sub-minimums instead."));
    } else notes.push("You meet the Skills Development sub-minimum of " + subMin + " points, so this element will not cause your overall level to be discounted.");
    if (comp && absPts < 5) notes.push("Absorbing more learners into jobs at the end of their programmes can earn up to 5 bonus points.");
    notes.push("This calculator scores the Skills Development element only. For a full B-BBEE level estimate including ownership, management control and procurement, our team can do a complete assessment with you.");
    return res;
  }

  /* ---------- results ---------- */
  function render(res, ref, sent) {
    var html = '<div class="result-head">';
    if (res.sd) {
      var w = Math.round(Math.min(1, res.sd.points / res.sd.max) * 100);
      html += '<div class="level-badge ' + (res.sd.ok ? "l2" : "l9") + '"><small>Skills development</small><b>' + r2(res.sd.points) + " / " + res.sd.max + "</b><span>" + (res.sd.bonus ? "+ " + r2(res.sd.bonus) + " bonus &middot; " : "") + (res.sd.ok ? "Sub-minimum met" : "Below sub-minimum") + "</span></div>";
    } else {
      html += '<div class="level-badge l' + (res.auto + 1) + '"><small>Automatic level</small><b>' + esc(LEVELS[res.auto][1]) + "</b><span>" + LEVELS[res.auto][2] + " procurement recognition</span></div>";
    }
    html += '<div><p class="eyebrow">' + esc($("company").value) + "</p><h2>Your B-BBEE check</h2>" +
      '<p class="muted">' + esc(res.c.cat === "Generic" ? "Generic (large) entity" : res.c.cat === "EME" ? "Exempted Micro Enterprise (EME)" : "Qualifying Small Enterprise (QSE)") +
      (res.auto !== null ? " &middot; automatic " + esc(LEVELS[res.auto][1]) : "") + (res.sd ? " &middot; " + (res.isG ? "Generic" : "QSE") + " Skills Development scorecard" : "") + "</p>";
    if (res.sd) html += '<div class="sd-meter" aria-hidden="true"><span style="width:' + Math.round(Math.min(1, res.sd.points / res.sd.max) * 100) + '%"></span><i style="left:40%"></i></div><p class="small muted">The marker shows the 40% sub-minimum (' + res.sd.subMin + " points).</p>";
    html += "</div></div>";
    if (res.rows.length) {
      html += '<div class="table-scroll"><table class="data-table result-table"><thead><tr><th scope="col">Indicator</th><th scope="col">Your figure</th><th scope="col">Target</th><th scope="col">Points</th><th scope="col">To reach full points</th></tr></thead><tbody>';
      res.rows.forEach(function (x) {
        var w = Math.round(Math.min(1, x.points / x.max) * 100);
        html += "<tr><th scope=\"row\">" + esc(x.name) + '<span class="bar" aria-hidden="true"><i style="width:' + w + '%"></i></span></th><td>' + esc(x.figure) + "</td><td>" + esc(x.target) + "</td><td>" + r2(x.points) + " / " + x.max + (x.bonus ? " bonus" : "") + "</td><td>" +
          '<span class="pill ' + (x.gap === "Target met" ? "ok" : "bad") + '">' + esc(x.gap) + "</span></td></tr>";
      });
      html += '<tr class="total"><th scope="row">Skills development total</th><td colspan="4"><strong>' + r2(res.sd.points) + " / " + res.sd.max + (res.sd.bonus ? " + " + r2(res.sd.bonus) + " bonus" : "") + "</strong></td></tr></tbody></table></div>";
    }
    if (res.notes.length) html += '<h3 class="mt-m">What this means</h3><ul class="bullets">' + res.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    var seta = $("seta").value;
    if (seta && seta !== "Not sure") html += '<p class="muted small">Your SETA: <strong>' + esc(seta) + "</strong>. Submit your WSP and ATR on time to claim skills development points and the mandatory grant.</p>";
    html += '<h3 class="mt-m">Where we can help</h3><div class="result-help">' +
      [["Learnerships & internships", "/for-employers/learnerships-internships/"], ["Higher education bursaries", "/for-employers/higher-education-bursaries/"], ["Disability Skills Development", "/for-employers/disability-skills-development/"]]
        .map(function (h) { return '<a class="card linked" href="' + h[1] + '"><span class="kicker">Skills development</span><h4>' + esc(h[0]) + '</h4><span class="text-link">Learn more <span class="arrow" aria-hidden="true">&rarr;</span></span></a>'; }).join("") + "</div>";
    html += '<p class="sent ' + (sent ? "ok" : "warn") + '">' + (sent ? "Your results have been sent to the Skills College team" + (ref ? " (reference " + esc(ref) + ")" : "") + ". We will be in touch to talk you through them." : "We could not send your results automatically. Please email them to sales@skillscollege.co.za or call 012 541 0100.") + "</p>";
    html += '<p class="disclaimer">This is an indicative estimate based on the information you entered and the Amended Codes of Good Practice. It is not a B-BBEE certificate or verification.</p>';
    html += '<div class="actions"><a class="btn btn-orange" href="/contact/?topic=b-bbee">Get a full B-BBEE assessment <span class="arrow" aria-hidden="true">&rarr;</span></a><button type="button" class="btn btn-outline" data-restart>Edit my answers</button></div>';
    resultBox.innerHTML = html;
    resultBox.hidden = false; form.hidden = true;
    resultBox.querySelector("[data-restart]").onclick = function () { resultBox.hidden = true; form.hidden = false; go(1); };
    resultBox.focus({ preventScroll: true });
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- sharing results with the sales team ---------- */
  var INPUT_IDS = ["turnover", "own_black", "own_bw", "sd_payroll", "sd_emp", "sd_lp", "sd_lp_f", "sd_burs", "sd_dis", "sd_learners", "sd_completed", "sd_absorbed"];
  function share(res) {
    var inputs = {};
    INPUT_IDS.forEach(function (id) { var el = $(id); if (el && el.value !== "") inputs[id] = num(id); });
    var sectorLabel = $("sector").options[$("sector").selectedIndex].text;
    var level = res.auto !== null ? LEVELS[res.auto][1] + " (automatic)" : "Not calculated (Skills Development check)";
    var payload = {
      company: $("company").value, contact: $("contact").value, email: $("email").value, phone: $("phone").value, role: $("role").value,
      sector: sectorLabel, seta: $("seta").value, turnover: num("turnover"), category: res.c.cat,
      scorecard: res.sd ? (res.isG ? "Generic" : "QSE") + " Skills Development" : "EME/QSE affidavit",
      level: level, recognition: res.auto !== null ? LEVELS[res.auto][2] : "", points: res.sd ? r2(res.sd.points + res.sd.bonus) : null, discounted: res.sd ? !res.sd.ok : false,
      elements: res.rows.map(function (x) { return { name: x.name, points: r2(x.points), max: x.max, bonus: x.bonus ? r2(x.points) : 0, subMin: x.gap }; }),
      notes: res.notes, inputs: inputs, consent: $("consent").checked, botField: form.querySelector('[name="bot-field"]').value, elapsed: Date.now() - startedAt
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
      fd.append("level", payload.level); fd.append("recognition", payload.recognition);
      fd.append("total-points", res.sd ? "Skills development " + r2(res.sd.points) + "/" + res.sd.max + (res.sd.bonus ? " + " + r2(res.sd.bonus) + " bonus" : "") : "Not scored");
      fd.append("discounted", res.sd ? (res.sd.ok ? "Skills sub-minimum met" : "Skills sub-minimum NOT met") : "n/a");
      fd.append("element-breakdown", res.rows.map(function (x) { return x.name + ": " + r2(x.points) + "/" + x.max + " (" + x.gap + ")"; }).join("\n") || "Automatic level on affidavit");
      fd.append("notes", payload.notes.join("\n"));
      fd.append("inputs", Object.keys(inputs).map(function (k) { return k + ": " + inputs[k]; }).join("\n"));
      fd.append("source-page", location.pathname);
      return fetch("/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: fd.toString() })
        .then(function (r) { return { ref: ref, sent: r.ok || !!out }; })
        .catch(function () { return { ref: ref, sent: !!out }; });
    });
  }

  /* ---------- steps (1 business, 2 skills development, then results) ---------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
  var LAST = 2, cur = 1;
  var prev = form.querySelector("[data-prev]"), next = form.querySelector("[data-next]"), skipNote = form.querySelector("[data-skip-note]");
  function go(n) {
    cur = n;
    steps.forEach(function (fs) { fs.hidden = +fs.getAttribute("data-step") !== n; fs.classList.remove("consent-only"); });
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
    next.innerHTML = (cur === LAST || (cur === 1 && auto)) ? 'See my result <span class="arrow" aria-hidden="true">&rarr;</span>' : 'Next <span class="arrow" aria-hidden="true">&rarr;</span>';
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
    if (!consentBox()) { $("consent").focus(); return; }
    next.disabled = true; next.textContent = "Calculating...";
    var res = calc();
    share(res).then(function (o) { render(res, o.ref, o.sent); next.disabled = false; go(cur); });
  }
  var consentOnly = false;
  next.addEventListener("click", function () {
    if (cur === 1) {
      if (!validStep1()) return;
      if (usedCard() === "auto") {
        if (!$("consent").checked) {
          // show only the consent box from step 2 before sending the result
          go(2); var fs = form.querySelector('fieldset[data-step="2"]'); fs.classList.add("consent-only"); consentOnly = true;
          next.innerHTML = 'See my result <span class="arrow" aria-hidden="true">&rarr;</span>'; consentBox(); return;
        }
        return finish();
      }
    }
    if (cur === LAST) return finish();
    go(cur + 1);
  });
  prev.addEventListener("click", function () { consentOnly = false; go(Math.max(1, cur - 1)); });
  form.querySelectorAll(".calc-steps li").forEach(function (li) {
    li.addEventListener("click", function () { var s = +li.getAttribute("data-goto"); if (s < cur) go(s); });
  });
  ["turnover", "own_black", "sector"].forEach(function (id) { $(id).addEventListener("input", showCategory); $(id).addEventListener("change", showCategory); });
  $("use_full").addEventListener("change", function () { applyScorecardFields(); go(1); });
  $("consent").addEventListener("change", consentBox);
  form.addEventListener("input", function (e) { var f = e.target.closest(".field.invalid"); if (f) f.classList.remove("invalid"); });
  form.addEventListener("submit", function (e) { e.preventDefault(); next.click(); });
  form.querySelectorAll(".num.has-pre input").forEach(function (inp) {
    if (inp.closest(".num").querySelector(".pre").textContent !== "R") return;
    inp.addEventListener("blur", function () { var v = num(inp.id); inp.value = v ? Math.round(v).toLocaleString("en-ZA") : ""; });
  });
  go(1);
})();
