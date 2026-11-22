/* Links page (/links/): filter for the link directory, as progressive enhancement.
   Without JS the "Jump to" index and every link show. With JS the index becomes category toggles next
   to a text field; rows that do not match and categories left empty are hidden with a class (not
   [hidden], so "Copy for your AI" still copies every link). The count is announced once per change,
   debounced. A link to a category or a row always shows its target: the filter is cleared first. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.querySelector("[data-links]");
  if (!root) { return; }
  var filter = root.querySelector("[data-links-filter]");
  var jump = root.querySelector("[data-links-jump]");
  var input = root.querySelector("[data-links-q]");
  var countEl = root.querySelector("[data-links-count]");
  var empty = root.querySelector("[data-links-empty]");
  var list = root.querySelector(".ldir__list");
  if (!filter || !input || !countEl || !list) { return; }

  function all(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }
  function norm(s) {
    s = String(s || "").toLowerCase();
    if (s.normalize) { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    return s.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
  }
  function plural(n) { return n + (n === 1 ? " link" : " links"); }

  var chips = all("[data-cat-filter]", filter);
  var clears = all("[data-links-clear]", root);
  var total = 0;
  // Search only what a reader sees: leave out term popovers, screen-reader text, hidden glyphs and labels.
  function rowText(li) {
    var c = li.cloneNode(true);
    all(".sr-only, .term-pop, [aria-hidden='true'], .lrow__label", c).forEach(function (n) {
      if (n.parentNode) { n.parentNode.removeChild(n); }
    });
    return c.textContent;
  }
  var cats = all("[data-cat]", list).map(function (sec) {
    var h = sec.querySelector("h3");
    var title = h ? h.textContent.trim() : "";
    var rows = all("[data-row]", sec).map(function (li) {
      return { el: li, text: norm(rowText(li) + " " + title) };
    });
    total += rows.length;
    return { el: sec, id: sec.id, title: title, rows: rows, count: sec.querySelector("[data-cat-count]") };
  });

  var state = { q: "", cat: "" };
  var announced = countEl.textContent;
  var more = root.querySelector("[data-links-more]");
  var moreLabel = more ? more.querySelector("[data-links-more-label]") : null;
  var timer = 0;

  function active() { return state.q !== "" || state.cat !== ""; }

  function summary(shown) {
    var where = "";
    if (state.cat) {
      cats.forEach(function (c) { if (c.id === state.cat) { where = " in " + c.title; } });
    }
    if (!active()) { return plural(total); }
    if (shown === 0) { return "No links match"; }
    return shown + " of " + plural(total) + where;
  }

  function apply() {
    var words = norm(state.q).split(" ").filter(Boolean);
    var shown = 0;
    var textHits = { "": 0 };
    cats.forEach(function (c) {
      var inCat = !state.cat || c.id === state.cat;
      var n = 0, t = 0;
      c.rows.forEach(function (r) {
        var hit = words.every(function (w) { return r.text.indexOf(w) !== -1; });
        var ok = inCat && hit;
        r.el.classList.toggle("is-out", !ok);
        if (hit) { t += 1; }
        if (ok) { n += 1; }
      });
      textHits[c.id] = t; textHits[""] += t;
      c.el.classList.toggle("is-out", n === 0);
      if (c.count) { c.count.textContent = n === c.rows.length ? plural(n) : n + " of " + plural(c.rows.length); }
      shown += n;
    });
    // Each category toggle shows how many links in it match the text, so a press never surprises.
    chips.forEach(function (b) {
      var id = b.getAttribute("data-cat-filter");
      b.setAttribute("aria-pressed", String(id === state.cat));
      var num = b.querySelector("[data-n]"), word = b.querySelector("[data-n-word]");
      var hits = textHits[id] || 0;
      if (num) { num.textContent = String(hits); }
      if (word) { word.textContent = hits === 1 ? " link" : " links"; }
    });
    clears.forEach(function (b) { if (b.closest("[data-links-filter]")) { b.setAttribute("aria-disabled", String(!active())); } });
    if (empty) { empty.hidden = shown !== 0; }
    if (moreLabel) {
      var name = "";
      cats.forEach(function (c) { if (c.id === state.cat) { name = c.title; } });
      moreLabel.textContent = name ? "Category: " + name : "Categories";
    }
    return shown;
  }

  // The visible count doubles as the polite live region: written once things settle, and only
  // when its text changes, so a screen reader hears one announcement per change.
  function announce(shown, now) {
    window.clearTimeout(timer);
    var write = function () {
      var text = summary(shown);
      if (text !== announced) { countEl.textContent = text; announced = text; }
    };
    if (now) { write(); } else { timer = window.setTimeout(write, 400); }
  }

  // After filtering, the list can shrink above the reader: bring its top back into view.
  function keepListInView() {
    var top = list.getBoundingClientRect().top;
    if (top < 0) { list.scrollIntoView({ block: "start" }); }
  }

  function update(now) {
    var shown = apply();
    announce(shown, now);
    keepListInView();
  }

  function clearAll(focusInput) {
    state.q = ""; state.cat = ""; input.value = "";
    update(true);
    if (focusInput) { input.focus(); }
  }

  input.addEventListener("input", function () {
    state.q = input.value;
    update(false);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && input.value) { e.preventDefault(); state.q = ""; input.value = ""; update(true); }
    if (e.key === "Enter") { e.preventDefault(); }
  });
  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-cat-filter");
      state.cat = state.cat === id ? "" : id;
      update(true);
    });
  });
  clears.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("aria-disabled") === "true") { return; }
      clearAll(true);
    });
  });

  // A link to a category, a row or a heading in the directory always shows its target.
  function needsClear(id) {
    if (!id || !active()) { return false; }
    var t = null;
    try { t = doc.getElementById(decodeURIComponent(id)); } catch (e) { t = null; }
    return !!(t && list.contains(t));
  }
  doc.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href*='#']") : null;
    if (!a || a.pathname !== window.location.pathname || a.host !== window.location.host || a.hash.length < 2) { return; }
    // Runs before the browser follows the link, so it scrolls to the target once it is visible again.
    if (needsClear(a.hash.slice(1))) { state.q = ""; state.cat = ""; input.value = ""; apply(); announce(0, true); }
  }, true);
  window.addEventListener("hashchange", function () {
    var id = window.location.hash.slice(1);
    if (needsClear(id)) {
      state.q = ""; state.cat = ""; input.value = ""; apply(); announce(0, true);
      var t = doc.getElementById(decodeURIComponent(id));
      if (t) { t.scrollIntoView(); }
    }
  });

  // Ready: swap the plain index for the filter.
  filter.hidden = false;
  if (jump) { jump.hidden = true; }
  // A browser may restore a typed value on back/forward navigation.
  if (input.value) { state.q = input.value; }
  // Phones and tablets: the category toggles start folded, so the first link sits higher up.
  // From 960px they live in the sticky rail and stay open.
  if (more && window.matchMedia) {
    var wide = window.matchMedia("(min-width: 960px)");
    if (!wide.matches) { more.open = false; }
    var onWide = function () { if (wide.matches) { more.open = true; } };
    if (wide.addEventListener) { wide.addEventListener("change", onWide); } else if (wide.addListener) { wide.addListener(onWide); }
  }
  apply();
  var initText = summary(cats.reduce(function (n, c) {
    return n + c.rows.filter(function (r) { return !r.el.classList.contains("is-out"); }).length;
  }, 0));
  if (initText !== countEl.textContent) { countEl.textContent = initText; }
  announced = initText;
}());
