/* Network page (/network/): "Development of the node software", filled from the public
   development API of the status page (network.btx-monitoring.com/api/v1/development.json).
   Validation is ported from the original community.js (parseDevelopment). Every value is checked
   before use and only ever written with textContent. Polling: one request every ten minutes, as the
   original community.js (checked every 5 s), none while the tab is hidden, and only the newest request may paint.
   Without JavaScript or without an answer the section shows dashes and a link to GitHub.
   Nothing here is announced to screen readers: the figures change slowly and are read on demand. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.getElementById("development");
  if (!root || typeof fetch !== "function") { return; }

  var API = root.getAttribute("data-dev-api");
  var REPO = root.getAttribute("data-repo");
  if (!API || !REPO) { return; }

  var INTERVAL_MS = 10 * 60000; // as the original community.js; the data is measured hourly
  var STALE_MS = 3 * 3600000;
  var MAX_BRANCHES = 6;
  var MAX_PAGE = 100;
  var BRANCH = /^[A-Za-z0-9._][A-Za-z0-9._\/-]{0,99}$/;
  var TAG = /^[A-Za-z0-9._-]{1,64}$/;
  var LOCALE = "en-GB";

  function q(name) { return root.querySelector('[data-dev="' + name + '"]'); }

  function count(value, max) {
    return Number.isInteger(value) && value >= 0 && value < max ? value : null;
  }
  function instant(text) {
    return typeof text === "string" && !isNaN(Date.parse(text)) ? new Date(text) : null;
  }
  function branchRow(row) {
    if (!row || typeof row.name !== "string" || !BRANCH.test(row.name) || row.name.indexOf("..") !== -1) { return null; }
    var last = instant(row.last_commit_at);
    var commits = count(row.commits_30d, MAX_PAGE + 1);
    if (last === null || commits === null || typeof row.default !== "boolean" || typeof row.commits_30d_capped !== "boolean") { return null; }
    return { name: row.name, isDefault: row.default, last: last, commits: commits, capped: row.commits_30d_capped };
  }
  function parseRelease(value) {
    if (!value || typeof value.tag !== "string" || !TAG.test(value.tag)) { return null; }
    var published = instant(value.published_at);
    return published === null ? null : { tag: value.tag, published: published };
  }
  // Reduce development.json to what the section shows; null unless the branch table is complete and
  // clean, with the default branch first and only once. Optional values that fail become null.
  function parseDevelopment(text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { return null; }
    if (!d || d.schema_version !== 1 || d.repository !== REPO || !Array.isArray(d.branches)) { return null; }
    var measured = instant(d.measured_at);
    if (measured === null || d.branches.length === 0 || d.branches.length > MAX_BRANCHES) { return null; }
    var branches = [];
    for (var i = 0; i < d.branches.length; i += 1) {
      var row = branchRow(d.branches[i]);
      if (row === null || row.isDefault !== (i === 0)) { return null; }
      branches.push(row);
    }
    var pulls = count(d.pulls_updated_7d, MAX_PAGE + 1);
    return {
      measured: measured,
      staleFlag: d.stale === true,
      branches: branches,
      pulls: pulls,
      pullsCapped: pulls !== null && d.pulls_updated_7d_capped === true,
      release: parseRelease(d.latest_release),
      prerelease: parseRelease(d.latest_prerelease)
    };
  }

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function formatTime(date) {
    return date.getUTCFullYear() + "-" + two(date.getUTCMonth() + 1) + "-" + two(date.getUTCDate()) +
      " " + two(date.getUTCHours()) + ":" + two(date.getUTCMinutes()) + " UTC";
  }
  function formatDate(date) { return formatTime(date).slice(0, 10); }
  function formatAge(date, now) {
    // UTC calendar days, so the age always agrees with the UTC date printed beside it.
    var days = Math.max(0, Math.floor(now / 86400000) - Math.floor(date.getTime() / 86400000));
    if (days === 0) { return "today"; }
    return days === 1 ? "1 day ago" : days + " days ago";
  }
  function capped(value, isCapped) { return value.toLocaleString(LOCALE) + (isCapped ? "+" : ""); }
  // GitHub URL of a validated branch name or tag; each path segment encoded on its own.
  function githubUrl(kind, name) {
    return "https://github.com/" + REPO + "/" + kind + "/" + name.split("/").map(encodeURIComponent).join("/");
  }
  function el(tag, className, text) {
    var n = doc.createElement(tag);
    if (className) { n.className = className; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function extLink(href, text) {
    var a = el("a", "", text);
    a.href = href;
    a.rel = "noopener noreferrer";
    a.appendChild(doc.createTextNode(" "));
    var arr = el("span", "arr", "↗");
    arr.setAttribute("aria-hidden", "true");
    a.appendChild(arr);
    a.appendChild(el("span", "sr-only", " (opens another site)"));
    return a;
  }
  function cell(label, className) {
    var td = el("td", className || "");
    td.setAttribute("data-label", label);
    return td;
  }

  function renderBranches(dev, now) {
    var body = q("branches");
    if (!body) { return; }
    body.textContent = "";
    dev.branches.forEach(function (b) {
      var tr = el("tr");
      var name = cell("Branch");
      name.appendChild(extLink(githubUrl("commits", b.name), b.name));
      if (b.isDefault) { name.appendChild(doc.createTextNode(" ")); name.appendChild(el("span", "tag", "Default branch")); }
      tr.appendChild(name);
      var last = cell("Last commit");
      last.appendChild(doc.createTextNode(formatDate(b.last) + " "));
      var sep = el("span", "sep");
      sep.setAttribute("aria-hidden", "true");
      last.appendChild(sep);
      last.appendChild(doc.createTextNode(" "));
      last.appendChild(el("span", "nw-age", formatAge(b.last, now)));
      tr.appendChild(last);
      tr.appendChild(cell("Commits, 30 days", "num"));
      tr.lastChild.textContent = capped(b.commits, b.capped);
      body.appendChild(tr);
    });
  }
  function renderRelease(name, value) {
    var node = q(name);
    var date = q(name + "-date");
    var when = q(name + "-when");
    if (!node) { return; }
    node.textContent = "";
    if (when) { when.hidden = value === null; }
    if (value === null) {
      node.textContent = "—";
      if (date) { date.textContent = ""; }
      return;
    }
    var a = el("a", "", value.tag);
    a.href = githubUrl("releases/tag", value.tag);
    a.rel = "noopener noreferrer";
    a.appendChild(doc.createTextNode("\u00a0"));
    var arr = el("span", "arr", "↗");
    arr.setAttribute("aria-hidden", "true");
    a.appendChild(arr);
    a.appendChild(el("span", "sr-only", " on GitHub (opens another site)"));
    node.appendChild(a);
    if (date) { date.textContent = formatDate(value.published); }
  }
  // The no-JS Note is hidden with the hidden attribute (not CSS), so Copy for your AI skips it too.
  // A failed load shows as a "Check" warning, as the board's failure message does.
  function setMessage(text) {
    var box = q("msg");
    var line = q("msg-text");
    if (!box || !line) { return; }
    box.hidden = !text;
    box.classList.toggle("is-on", !!text);
    if (!text) { return; }
    line.textContent = text;
    box.classList.remove("callout--note");
    box.classList.add("callout--warn");
    var label = box.querySelector(".callout__label");
    if (label) { label.textContent = "Check"; }
  }

  function render(dev, now) {
    renderBranches(dev, now);
    var pulls = q("pulls");
    if (pulls) { pulls.textContent = dev.pulls === null ? "—" : capped(dev.pulls, dev.pullsCapped); }
    renderRelease("release", dev.release);
    renderRelease("prerelease", dev.prerelease);
    var tile = q("prerelease-tile");
    if (tile) { tile.hidden = dev.prerelease === null; }
    // Stale when the API says so or the measurement is more than three hours old, checked at every paint.
    var stale = q("stale");
    if (stale) { stale.hidden = !(dev.staleFlag || now - dev.measured.getTime() > STALE_MS); }
    var measured = q("measured");
    if (measured) { measured.textContent = "Measured on GitHub at " + formatTime(dev.measured) + ", every hour."; }
  }

  var lastGood = null;
  function paint(dev) {
    var now = Date.now();
    if (dev) {
      lastGood = dev;
      render(dev, now);
      setMessage("");
      return;
    }
    if (lastGood) {
      render(lastGood, now);
      setMessage("The newest development data could not be loaded; the figures below may be out of date.");
    } else {
      setMessage("Development data could not be loaded. See the branches, pull requests and releases on GitHub.");
    }
  }

  var lastFetch = 0;
  var seq = 0;
  function fetchDev() {
    lastFetch = Date.now();
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 15000) : 0;
    return fetch(API, { cache: "no-store", credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (text) { window.clearTimeout(timer); return parseDevelopment(text); })
      .catch(function () { window.clearTimeout(timer); return null; });
  }
  // Only the newest request may paint, so a late failure or an older answer never replaces a newer one.
  function refresh() {
    var mine = ++seq;
    fetchDev().then(function (dev) { if (mine === seq) { paint(dev); } });
  }

  setMessage("");
  refresh();
  window.setInterval(function () {
    if (!doc.hidden && Date.now() - lastFetch >= INTERVAL_MS - 1000) { refresh(); }
  }, 5000);
  doc.addEventListener("visibilitychange", function () {
    if (!doc.hidden && Date.now() - lastFetch >= INTERVAL_MS) { refresh(); }
  });
}());
