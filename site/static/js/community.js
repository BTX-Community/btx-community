// btx-community.com: fill the live strip, "BTX in numbers" and the upgrade countdown from the
// public API of the status page (network.btx-monitoring.com/api/v1/status.json) on load and
// every 60 seconds after. Without JavaScript or without an answer the strip shows dashes and the
// countdown stays hidden. The "Development activity" section reads development.json from the
// same API every 10 minutes and stays hidden until it has a usable answer. Every API answer is
// validated before use and only ever written with textContent. On the developers page it adds
// filters, a sort and a copy button to markup the build wrote; that page is complete without it.
(function () {
  "use strict";

  var INTERVAL_MS = 60000;
  var MAX_HEIGHT = 100000000;
  var MAX_NODES = 1000000;
  var MAX_SECONDS = 365 * 86400;
  var MAX_SUPPLY = 21000000;
  var MAX_BYTES = 1e15;
  var MAX_ACTIVATIONS = 10;
  var BLOCK_SECONDS = 90;
  var ACTIVATION_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
  var OVERALL = ["normal", "degraded", "incident"];
  var LEVELS = ["green", "yellow", "red", "unknown"];
  var RELEASE = /^v?[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
  var DAY = { en: "d", de: "T", es: "d", fr: "j", zh: "天" };
  var LOCALES = { en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR", zh: "zh-CN" };

  function count(value, max) {
    return Number.isInteger(value) && value >= 0 && value < max ? value : null;
  }

  // "BTX:0.34.15" (node census) and "v0.34.15" (release) both become "0.34.15".
  function plainVersion(text) {
    return text.replace(/^BTX:/, "").replace(/^v/, "");
  }

  // Reachable nodes and how many of them run the latest release; null if anything is unclear.
  function onRelease(census, release) {
    if (!Array.isArray(census) || census.length === 0 || release === null) {
      return null;
    }
    var total = 0;
    var current = 0;
    for (var i = 0; i < census.length; i += 1) {
      var row = census[i];
      var nodes = row ? count(row.nodes, MAX_NODES) : null;
      if (nodes === null || typeof row.version !== "string") {
        return null;
      }
      total += nodes;
      if (plainVersion(row.version) === plainVersion(release)) {
        current += nodes;
      }
    }
    return { count: current, total: total };
  }

  // Compact duration as on the status page: "45 s", "1 min 30 s", "2 h 5 min", "3 d 4 h".
  function formatDuration(seconds, lang) {
    var total = Math.max(0, Math.round(seconds));
    if (total < 120) {
      return total + " s";
    }
    if (total < 7200) {
      var secs = total % 60;
      return Math.floor(total / 60) + " min" + (secs ? " " + secs + " s" : "");
    }
    if (total < 172800) {
      var minutes = Math.floor((total % 3600) / 60);
      return Math.floor(total / 3600) + " h" + (minutes ? " " + minutes + " min" : "");
    }
    var hours = Math.floor((total % 86400) / 3600);
    var day = DAY[lang] || DAY.en;
    return Math.floor(total / 86400) + " " + day + (hours ? " " + hours + " h" : "");
  }

  function between(value, min, max) {
    return typeof value === "number" && isFinite(value) && value >= min && value <= max ? value : null;
  }

  // Scheduled rule changes still ahead of the tip; null unless every row is clean.
  function activations(rows) {
    if (!Array.isArray(rows) || rows.length > MAX_ACTIVATIONS) {
      return null;
    }
    var result = [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (!row || typeof row.name !== "string" || !ACTIVATION_NAME.test(row.name)) {
        return null;
      }
      var height = count(row.height, MAX_HEIGHT);
      var remaining = count(row.remaining_blocks, MAX_HEIGHT);
      if (height === null || remaining === null || remaining === 0) {
        return null;
      }
      result.push({ name: row.name, height: height, remaining: remaining });
    }
    return result;
  }

  function metric(doc, id) {
    for (var i = 0; i < doc.metrics.length; i += 1) {
      var entry = doc.metrics[i];
      if (entry && entry.id === id) {
        return entry.value;
      }
    }
    return null;
  }

  // Reduce a status document to the few values the strip shows; null if it is not usable.
  function parseStatus(text) {
    var doc;
    try {
      doc = JSON.parse(text);
    } catch (error) {
      return null;
    }
    if (!doc || doc.schema_version !== 1 || !Array.isArray(doc.metrics)) {
      return null;
    }
    if (OVERALL.indexOf(doc.overall) === -1 || typeof doc.stale !== "boolean") {
      return null;
    }
    var height = metric(doc, "chain.height");
    var release = metric(doc, "sw.latest_release");
    var verdicts = {};
    if (Array.isArray(doc.verdicts)) {
      doc.verdicts.forEach(function (verdict) {
        if (verdict && typeof verdict.id === "string" && LEVELS.indexOf(verdict.level) !== -1) {
          verdicts[verdict.id] = verdict.level;
        }
      });
    }
    var time = typeof doc.data_as_of === "string" ? doc.data_as_of : doc.generated_at;
    var interval = metric(doc, "chain.block_interval_avg_24h");
    var validRelease = typeof release === "string" && RELEASE.test(release) ? release : null;
    return {
      overall: doc.overall,
      stale: doc.stale,
      height: count(height, MAX_HEIGHT),
      release: validRelease,
      onRelease: onRelease(metric(doc, "net.versions"), validRelease),
      interval: typeof interval === "number" && isFinite(interval) && interval >= 0 && interval < MAX_SECONDS ? interval : null,
      signers: count(metric(doc, "attest.active_signers_100"), MAX_NODES),
      supply: between(metric(doc, "econ.supply_mined"), 0, MAX_SUPPLY),
      supplyShare: between(metric(doc, "econ.supply_pct_max"), 0, 100),
      reward: between(metric(doc, "econ.block_reward"), 0, 1000),
      halving: count(metric(doc, "econ.halving_countdown"), MAX_HEIGHT),
      tx: count(metric(doc, "econ.tx_24h"), MAX_HEIGHT),
      size: between(metric(doc, "chain.size_on_disk"), 0, MAX_BYTES),
      activations: activations(metric(doc, "sw.upcoming_activation")),
      verdicts: verdicts,
      time: typeof time === "string" && !isNaN(Date.parse(time)) ? new Date(time) : null,
    };
  }

  // "2026-11-03 17:09 UTC", as the page itself writes times.
  function formatTime(date) {
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return date.getUTCFullYear() + "-" + two(date.getUTCMonth() + 1) + "-" + two(date.getUTCDate()) +
      " " + two(date.getUTCHours()) + ":" + two(date.getUTCMinutes()) + " UTC";
  }

  function setText(root, name, text) {
    var element = root.querySelector('[data-live="' + name + '"]');
    if (element && text !== null) {
      element.textContent = element.dataset.template ? element.dataset.template.replace(/\{[a-z]+\}/, text) : text;
    }
  }

  // "BTX in numbers": only values that passed parseStatus are shown, each formatted for the page.
  function applyNumbers(root, status, locale) {
    var lang = root.dataset.lang;
    function number(value, digits) {
      return value.toLocaleString(locale, { maximumFractionDigits: digits });
    }
    setText(root, "supply", status.supply === null ? null : number(Math.round(status.supply), 0) + " BTX");
    setText(root, "supply-share", status.supplyShare === null ? null : number(status.supplyShare, 1));
    setText(root, "reward", status.reward === null ? null : number(status.reward, 8) + " BTX");
    setText(root, "halving", status.halving === null ? null : number(status.halving, 0));
    setText(root, "halving-time", status.halving === null ? null : formatDuration(status.halving * BLOCK_SECONDS, lang));
    setText(root, "tx", status.tx === null ? null : number(status.tx, 0));
    setText(root, "size", status.size === null ? null : number(status.size / 1e9, 1) + " GB");
  }

  // Upgrade countdown: shown while the status page lists a rule change ahead, hidden otherwise.
  function applyFork(root, status, locale) {
    var box = root.querySelector('[data-live="fork"]');
    var list = root.querySelector('[data-live="fork-rows"]');
    if (!box || !list || status.activations === null) {
      return;
    }
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    status.activations.forEach(function (row) {
      var item = document.createElement("li");
      item.textContent = box.dataset.template
        .replace("{name}", row.name)
        .replace("{height}", row.height.toLocaleString(locale))
        .replace("{remaining}", row.remaining.toLocaleString(locale))
        .replace("{time}", formatDuration(row.remaining * BLOCK_SECONDS, root.dataset.lang));
      list.appendChild(item);
    });
    box.hidden = status.activations.length === 0;
  }

  function apply(root, status) {
    var locale = LOCALES[root.dataset.lang] || LOCALES.en;
    applyNumbers(root, status, locale);
    applyFork(root, status, locale);
    var overall = root.querySelector('[data-live="overall"]');
    if (overall) {
      overall.textContent = overall.dataset["label" + status.overall.charAt(0).toUpperCase() + status.overall.slice(1)];
      OVERALL.forEach(function (name) { root.classList.toggle("c-live--" + name, name === status.overall); });
    }
    var stale = root.querySelector('[data-live="stale"]');
    if (stale) {
      stale.hidden = !status.stale;
    }
    var height = root.querySelector('[data-live="height"]');
    if (height && status.height !== null) {
      height.textContent = status.height.toLocaleString(locale);
    }
    var release = root.querySelector('[data-live="release"]');
    if (release && status.release !== null) {
      release.textContent = status.release;
    }
    var current = root.querySelector('[data-live="on-release"]');
    if (current && status.onRelease !== null) {
      current.textContent = current.dataset.template
        .replace("{count}", status.onRelease.count.toLocaleString(locale))
        .replace("{total}", status.onRelease.total.toLocaleString(locale));
    }
    var interval = root.querySelector('[data-live="interval"]');
    if (interval && status.interval !== null) {
      interval.textContent = formatDuration(status.interval, root.dataset.lang);
    }
    var signers = root.querySelector('[data-live="signers"]');
    if (signers && status.signers !== null) {
      signers.textContent = status.signers.toLocaleString(locale);
    }
    Array.prototype.forEach.call(root.querySelectorAll("[data-verdict]"), function (item) {
      var level = status.verdicts[item.dataset.verdict];
      var label = item.querySelector("[data-verdict-label]");
      if (!level || !label) {
        return;
      }
      LEVELS.forEach(function (name) { item.classList.toggle("c-verdict--" + name, name === level); });
      label.textContent = root.dataset["level" + level.charAt(0).toUpperCase() + level.slice(1)] || label.textContent;
    });
    var updated = root.querySelector('[data-live="updated"]');
    if (updated && status.time) {
      updated.textContent = updated.dataset.template.replace("{time}", formatTime(status.time));
    }
  }

  // --- Development activity: btx-monitoring measures btxchain/btx on GitHub every hour ---

  var DEV_INTERVAL_MS = 10 * 60000;
  var DEV_STALE_MS = 3 * 3600000;
  var MAX_BRANCHES = 6;
  var MAX_PAGE = 100;
  var BRANCH = /^[A-Za-z0-9._][A-Za-z0-9._\/-]{0,99}$/;
  var TAG = /^[A-Za-z0-9._-]{1,64}$/;

  function instant(text) {
    return typeof text === "string" && !isNaN(Date.parse(text)) ? new Date(text) : null;
  }

  function branchRow(row) {
    if (!row || typeof row.name !== "string" || !BRANCH.test(row.name) || row.name.indexOf("..") !== -1) {
      return null;
    }
    var last = instant(row.last_commit_at);
    var commits = count(row.commits_30d, MAX_PAGE + 1);
    if (last === null || commits === null || typeof row.default !== "boolean" || typeof row.commits_30d_capped !== "boolean") {
      return null;
    }
    return { name: row.name, isDefault: row.default, last: last, commits: commits, capped: row.commits_30d_capped };
  }

  function parseRelease(value) {
    if (!value || typeof value.tag !== "string" || !TAG.test(value.tag)) {
      return null;
    }
    var published = instant(value.published_at);
    return published === null ? null : { tag: value.tag, published: published };
  }

  // Reduce development.json to what the panel shows; null unless the branch table is complete and
  // clean, with the default branch first and only once. Optional values that fail become null.
  function parseDevelopment(text, repository, now) {
    var doc;
    try {
      doc = JSON.parse(text);
    } catch (error) {
      return null;
    }
    if (!doc || doc.schema_version !== 1 || doc.repository !== repository || !Array.isArray(doc.branches)) {
      return null;
    }
    var measured = instant(doc.measured_at);
    if (measured === null || doc.branches.length === 0 || doc.branches.length > MAX_BRANCHES) {
      return null;
    }
    var branches = [];
    for (var i = 0; i < doc.branches.length; i += 1) {
      var row = branchRow(doc.branches[i]);
      if (row === null || row.isDefault !== (i === 0)) {
        return null;
      }
      branches.push(row);
    }
    var pulls = count(doc.pulls_updated_7d, MAX_PAGE + 1);
    return {
      measured: measured,
      stale: doc.stale === true || now - measured.getTime() > DEV_STALE_MS,
      branches: branches,
      pulls: pulls,
      pullsCapped: pulls !== null && doc.pulls_updated_7d_capped === true,
      release: parseRelease(doc.latest_release),
      prerelease: parseRelease(doc.latest_prerelease),
    };
  }

  function formatDate(date) {
    return formatTime(date).slice(0, 10);
  }

  // "today", "1 day ago", "12 days ago", from the section's own texts.
  function formatAge(date, now, texts) {
    var days = Math.max(0, Math.floor((now - date.getTime()) / 86400000));
    if (days === 0) {
      return texts.today;
    }
    return days === 1 ? texts.day : texts.days.replace("{count}", String(days));
  }

  // GitHub URL of a validated branch name or tag; each path segment encoded on its own.
  function githubUrl(repository, kind, name) {
    return "https://github.com/" + repository + "/" + kind + "/" + name.split("/").map(encodeURIComponent).join("/");
  }

  function cell(tag, className, text) {
    var element = document.createElement(tag);
    element.className = className;
    element.setAttribute("role", "cell");
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function applyDevelopment(root, dev, now) {
    var locale = LOCALES[root.dataset.lang] || LOCALES.en;
    var repository = root.dataset.repo;
    var list = root.querySelector('[data-dev="branches"]');
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    dev.branches.forEach(function (branch) {
      var row = document.createElement("div");
      row.className = "c-branch";
      row.setAttribute("role", "row");
      var name = cell("span", "c-branch__name");
      var link = document.createElement("a");
      link.className = "c-link";
      link.href = githubUrl(repository, "commits", branch.name);
      link.rel = "noopener noreferrer";
      link.textContent = branch.name;
      name.appendChild(link);
      if (branch.isDefault) {
        var label = document.createElement("span");
        label.className = "c-branch__default";
        label.textContent = root.dataset.default;
        name.appendChild(label);
      }
      row.appendChild(name);
      row.appendChild(cell("span", "c-branch__last", formatDate(branch.last) + " · " + formatAge(branch.last, now, root.dataset)));
      row.appendChild(cell("span", "c-branch__commits", branch.commits.toLocaleString(locale) + (branch.capped ? "+" : "")));
      list.appendChild(row);
    });
    setDev(root, "pulls", dev.pulls === null ? null : dev.pulls.toLocaleString(locale) + (dev.pullsCapped ? "+" : ""));
    applyRelease(root, "release", dev.release);
    applyRelease(root, "prerelease", dev.prerelease);
    root.querySelector('[data-dev="prerelease-tile"]').hidden = dev.prerelease === null;
    root.querySelector('[data-dev="stale"]').hidden = !dev.stale;
    var measured = root.querySelector('[data-dev="measured"]');
    measured.textContent = measured.dataset.template.replace("{time}", formatTime(dev.measured));
    root.hidden = false;
  }

  function setDev(root, name, text) {
    var element = root.querySelector('[data-dev="' + name + '"]');
    if (element && text !== null) {
      element.textContent = text;
    }
  }

  function applyRelease(root, name, value) {
    var element = root.querySelector('[data-dev="' + name + '"]');
    if (!element || value === null) {
      return;
    }
    var link = document.createElement("a");
    link.className = "c-link";
    link.href = githubUrl(root.dataset.repo, "releases/tag", value.tag);
    link.rel = "noopener noreferrer";
    link.textContent = value.tag;
    element.textContent = "";
    element.appendChild(link);
    setDev(root, name + "-date", formatDate(value.published));
  }

  // The section stays hidden until a usable answer arrives; a later failure keeps what is shown.
  function refreshDevelopment(root) {
    fetch(root.dataset.api, { cache: "no-store", credentials: "omit" })
      .then(function (response) { return response.ok ? response.text() : ""; })
      .then(function (text) {
        var now = Date.now();
        var dev = parseDevelopment(text, root.dataset.repo, now);
        if (dev) {
          applyDevelopment(root, dev, now);
        }
      })
      .catch(function () { /* keep the section as it is */ });
  }

  // roots: the live panel and the status box at the top of every page; one request fills both.
  function refresh(roots) {
    fetch(roots[0].dataset.api, { cache: "no-store", credentials: "omit" })
      .then(function (response) { return response.ok ? response.text() : ""; })
      .then(function (text) {
        var status = parseStatus(text);
        if (status) {
          roots.forEach(function (root) { apply(root, status); });
        }
      })
      .catch(function () { /* keep the values shown so far */ });
  }

  // --- Developers page: filters, a sort and a copy button on markup the build wrote ----------
  // Everything here only toggles attributes (hidden, aria-pressed, aria-sort, aria-expanded,
  // open), sets the text of counters, buttons and status lines, and re-appends table rows that
  // exist; without JavaScript the page shows all of it. The DOM is data: a chip or row with an
  // unknown kind, status or sort key is ignored. STATUSES, KINDS and SORTS are compared with the
  // build by site/tests/test_build.py.

  var STATUSES = ["worklist", "baseline", "count-first", "rule-only", "needs-ci", "generators", "evidence"];
  var KINDS = ["area", "class", "infra"];
  var SORTS = ["listed", "lowest", "risk", "size"];
  var COPIED_MS = 2000;
  var SORT_ORDER = { lowest: "ascending", risk: "ascending", size: "descending" };
  var LANE_ANCHOR = /^lane-[A-Z]-[A-Z0-9-]{1,20}$/;

  // Which lanes to show: kind "all" or one of KINDS; waitingOnly shows only lanes waiting for an
  // owner. lane = { kind, waiting }.
  function laneVisible(lane, kind, waitingOnly) {
    if (!lane || KINDS.indexOf(lane.kind) === -1 || (kind !== "all" && KINDS.indexOf(kind) === -1)) {
      return false;
    }
    return (kind === "all" || lane.kind === kind) && (!waitingOnly || lane.waiting === true);
  }

  // Which registry rows to show: status "all" or one of STATUSES. row = { status }.
  function classVisible(row, status) {
    if (!row || STATUSES.indexOf(row.status) === -1) {
      return false;
    }
    return status === "all" || row.status === status;
  }

  // {all: n, worklist: n, ...} from rows; rows with an unknown status are not counted.
  function countByStatus(rows) {
    var counts = { all: 0 };
    STATUSES.forEach(function (status) { counts[status] = 0; });
    rows.forEach(function (row) {
      if (row && STATUSES.indexOf(row.status) !== -1) {
        counts[row.status] += 1;
        counts.all += 1;
      }
    });
    return counts;
  }

  // Order of area ids for key "listed" | "lowest" | "risk" | "size": listed keeps the input order;
  // lowest sorts by unit coverage ascending, risk by rank ascending, size by lines descending.
  // Rows without the key go last in listed order; ties keep listed order. areas = [{ id, unit, rank, loc }]
  function areaOrder(areas, key) {
    var field = { lowest: "unit", risk: "rank", size: "loc" }[key];
    var rows = areas.map(function (area, index) { return { area: area, index: index }; });
    if (field) {
      rows.sort(function (a, b) {
        var x = a.area[field];
        var y = b.area[field];
        if (x === null || y === null) {
          return (x === null) - (y === null) || a.index - b.index;
        }
        return (key === "size" ? y - x : x - y) || a.index - b.index;
      });
    }
    return rows.map(function (row) { return row.area.id; });
  }

  // The data-unit, data-rank and data-loc of a row as numbers; "" or a non-number becomes null.
  function areaFromRow(dataset) {
    function number(text) {
      if (typeof text !== "string" || text.trim() === "") {
        return null;
      }
      var value = Number(text);
      return isFinite(value) ? value : null;
    }
    return { unit: number(dataset.unit), rank: number(dataset.rank), loc: number(dataset.loc) };
  }

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function pressOnly(buttons, pressed) {
    buttons.forEach(function (button) { button.setAttribute("aria-pressed", String(button === pressed)); });
  }

  // "{shown} of {total} …" from the template the build wrote into data-template.
  function showCount(line, shown, total) {
    if (line && line.dataset.template) {
      line.textContent = line.dataset.template.replace("{shown}", String(shown)).replace("{total}", String(total));
    }
  }

  function enhanceRegistry() {
    var table = document.getElementById("registry");
    var bar = document.querySelector('.c-filter[data-filter="registry"]');
    if (!table || !bar) {
      return;
    }
    var rows = toArray(table.querySelectorAll("tbody tr[data-status]"));
    var chips = toArray(bar.querySelectorAll("button[data-status]")).filter(function (chip) {
      return chip.dataset.status === "all" || STATUSES.indexOf(chip.dataset.status) !== -1;
    });
    var shown = bar.querySelector(".c-filter__shown");
    var counts = countByStatus(rows.map(function (row) { return { status: row.dataset.status }; }));
    chips.forEach(function (chip) {
      var count = chip.querySelector(".c-filter__count");
      if (count) {
        count.textContent = String(counts[chip.dataset.status]);
      }
      chip.addEventListener("click", function () {
        var visible = 0;
        pressOnly(chips, chip);
        rows.forEach(function (row) {
          row.hidden = !classVisible({ status: row.dataset.status }, chip.dataset.status);
          visible += row.hidden ? 0 : 1;
        });
        showCount(shown, visible, rows.length);
      });
    });
    showCount(shown, rows.length, rows.length);
    bar.hidden = false;
  }

  // Returns reveal(): show every lane again, so a link to a lane the filter hid has a target.
  function enhanceLanes(section) {
    var bar = section.querySelector('.c-filter[data-filter="lanes"]');
    if (!bar) {
      return null;
    }
    var cards = toArray(section.querySelectorAll(".c-lane[data-kind]"));
    var groups = toArray(section.querySelectorAll(".c-lane-group"));
    var details = toArray(section.querySelectorAll(".c-lane__done"));
    var chips = toArray(bar.querySelectorAll("button[data-kind]")).filter(function (chip) {
      return chip.dataset.kind === "all" || KINDS.indexOf(chip.dataset.kind) !== -1;
    });
    var waiting = bar.querySelector("input[data-waiting-only]");
    var expand = bar.querySelector("button[data-expand]");
    var reset = bar.querySelector("button[data-reset]");
    var shown = bar.querySelector(".c-filter__shown");
    var state = { kind: "all", waiting: false };

    function update() {
      var count = 0;
      cards.forEach(function (card) {
        var visible = laneVisible({ kind: card.dataset.kind, waiting: card.dataset.waiting === "1" }, state.kind, state.waiting);
        card.hidden = !visible;
        count += visible ? 1 : 0;
      });
      groups.forEach(function (group) {
        group.hidden = group.querySelector(".c-lane:not([hidden])") === null;
      });
      showCount(shown, count, cards.length);
    }

    // The button follows the done bars: "collapse" once all of them are open, also by hand.
    function syncExpand() {
      var open = details.length > 0 && details.every(function (item) { return item.open; });
      if (expand) {
        expand.textContent = open ? expand.dataset.labelCollapse : expand.dataset.labelExpand;
        expand.setAttribute("aria-expanded", String(open));
      }
    }

    function setOpen(open) {
      details.forEach(function (item) { item.open = open; });
      syncExpand();
    }

    function showAll() {
      state = { kind: "all", waiting: false };
      if (waiting) {
        waiting.checked = false;
      }
      pressOnly(chips, chips.filter(function (chip) { return chip.dataset.kind === "all"; })[0]);
      update();
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.kind = chip.dataset.kind;
        pressOnly(chips, chip);
        update();
      });
    });
    if (waiting) {
      waiting.addEventListener("change", function () {
        state.waiting = waiting.checked;
        update();
      });
    }
    if (expand) {
      expand.addEventListener("click", function () { setOpen(expand.getAttribute("aria-expanded") !== "true"); });
      details.forEach(function (item) { item.addEventListener("toggle", syncExpand); });
    }
    if (reset) {
      reset.addEventListener("click", function () {
        setOpen(false);
        showAll();
      });
    }
    update();
    syncExpand();
    bar.hidden = false;
    return showAll;
  }

  function enhanceAreas() {
    var table = document.getElementById("areas");
    var bar = document.querySelector('.c-filter[data-filter="areas"]');
    if (!table || !bar || !table.tBodies.length) {
      return;
    }
    var body = table.tBodies[0];
    var rows = toArray(body.rows);
    var byId = {};
    var areas = rows.map(function (row) {
      byId[row.id] = row;
      var area = areaFromRow(row.dataset);
      area.id = row.id;
      return area;
    });
    var chips = toArray(bar.querySelectorAll("button[data-sort]")).filter(function (chip) {
      return SORTS.indexOf(chip.dataset.sort) !== -1;
    });
    var columns = toArray(table.querySelectorAll("th[data-sort-column]"));
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.dataset.sort;
        pressOnly(chips, chip);
        areaOrder(areas, key).forEach(function (id) { body.appendChild(byId[id]); });
        columns.forEach(function (column) {
          if (column.dataset.sortColumn === key && SORT_ORDER[key]) {
            column.setAttribute("aria-sort", SORT_ORDER[key]);
          } else {
            column.removeAttribute("aria-sort");
          }
        });
      });
    });
    bar.hidden = false;
  }

  function enhanceCopy() {
    var button = document.querySelector(".c-btn--copy[data-copy]");
    var clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (!button || !clipboard || typeof clipboard.writeText !== "function") {
      return;
    }
    var source = document.getElementById(button.dataset.copy);
    if (!source) {
      return;
    }
    var label = button.textContent;
    var hint = document.querySelector("[data-copy-hint]");
    var status = document.querySelector("[data-copy-status]");
    var timer = null;
    button.addEventListener("click", function () {
      clipboard.writeText(source.textContent).then(function () {
        button.textContent = button.dataset.copied || label;
        if (status) {
          status.textContent = button.dataset.copied || "";
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          button.textContent = label;
          if (status) {
            status.textContent = "";
          }
        }, COPIED_MS);
      }, function () {
        // Copying was refused: select the prompt and show the hint, so the reader copies by hand.
        var range = document.createRange();
        range.selectNodeContents(source);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        if (hint) {
          hint.hidden = false;
        }
      });
    });
    button.hidden = false;
    if (hint) {
      hint.hidden = true;
    }
  }

  // A link to a lane (#lane-A-WALLET) shows the lane, also when the filter hid it, and opens its
  // done bar. scroll: true when the browser has already tried to scroll to it (hashchange).
  function openLane(id, reveal, scroll) {
    if (!LANE_ANCHOR.test(id)) {
      return;
    }
    var card = document.getElementById(id);
    if (!card || !card.classList.contains("c-lane")) {
      return;
    }
    if (card.hidden && reveal) {
      reveal();
      if (scroll) {
        card.scrollIntoView();
      }
    }
    var done = card.querySelector(".c-lane__done");
    if (done) {
      done.open = true;
    }
  }

  // Contents rail: marks the section the reader is in (aria-current), the highest one whose top
  // has passed the upper third of the window. Without IntersectionObserver nothing is marked.
  function enhanceRail(rail) {
    if (typeof IntersectionObserver !== "function") {
      return;
    }
    var links = toArray(rail.querySelectorAll("a[href^='#']"));
    var targets = links.map(function (link) { return document.getElementById(link.hash.slice(1)); });
    var visible = {};
    function mark() {
      var current = -1;
      targets.forEach(function (target, index) {
        if (target && visible[index]) {
          current = current === -1 ? index : current;
        }
      });
      if (current === -1) {
        return;
      }
      links.forEach(function (link, index) {
        if (index === current) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[targets.indexOf(entry.target)] = entry.isIntersecting;
      });
      mark();
    }, { rootMargin: "-80px 0px -60% 0px" });
    targets.forEach(function (target) {
      if (target) {
        observer.observe(target);
      }
    });
  }

  // A link into a folded section (#flow, #gate-CI-1, #phase-3) opens every closed <details> around
  // its target and scrolls to it; the browser could not, since the target was not rendered.
  // scroll: false when the browser is about to scroll there itself (a click on the link).
  function openFolds(id, scroll) {
    var target = id ? document.getElementById(id) : null;
    var opened = false;
    // A link to the section itself (#flow) opens its own fold.
    var own = target ? target.querySelector(":scope > details.c-fold") : null;
    if (own && !own.open) {
      own.open = true;
      opened = true;
    }
    for (var node = target; node; node = node.parentElement) {
      if (node.tagName === "DETAILS" && !node.open) {
        node.open = true;
        opened = true;
      }
    }
    if (opened && scroll !== false) {
      target.scrollIntoView();
    }
  }

  function enhanceHub(lanes) {
    enhanceRegistry();
    var reveal = enhanceLanes(lanes);
    enhanceAreas();
    function fromHash() {
      var id = window.location.hash.slice(1);
      openLane(id, reveal, true);
      openFolds(id);
    }
    // A click runs before the browser scrolls, and also when the hash is already the same.
    toArray(document.querySelectorAll("a.c-table__lane")).forEach(function (link) {
      link.addEventListener("click", function () { openLane(link.hash.slice(1), reveal, false); });
    });
    fromHash();
    window.addEventListener("hashchange", fromHash);
  }

  // --- Links shared before the site had several pages, e.g. /#development or /de/#links ---

  var MOVED = [
    [/^development$/, "network/"],
    [/^(about|next|fact-[a-z0-9-]+)$/, "learn/"],
    [/^(links|cat-[a-z0-9-]+)$/, "links/"],
    [/^(documents|doc-[a-z0-9-]+)$/, "projects/"],
  ];

  // Sections of the developers page that moved to its sub-page "Ongoing work" (/dev/work/).
  var DEV_MOVED = new RegExp(
    "^((coverage|classes|lanes|flow|gates|ci|rhythm|owner-rules)(-title)?|coverage-weekly|never|sweeps-title|runs-title|areas(-title)?|" +
    "baselines-title|registry|routes-title|escalation-title|week-title|gates-(ci|release)-title|" +
    "(figure|run|area|baseline|class|group|lane|route|gate|day|phase)-[A-Za-z0-9_-]+)$"
  );

  // Where a section of the old single page lives now; null if the hash is not one of them.
  function movedTarget(pathname, hash) {
    var id = hash.replace(/^#/, "");
    var dev = /^\/([a-z]{2}\/)?dev\/$/.exec(pathname);
    if (dev && id && DEV_MOVED.test(id)) {
      return "/" + (dev[1] || "") + "dev/work/#" + id;
    }
    var home = /^\/([a-z]{2}\/)?$/.exec(pathname);
    if (!home || !id) {
      return null;
    }
    for (var i = 0; i < MOVED.length; i += 1) {
      if (MOVED[i][0].test(id)) {
        return "/" + (home[1] || "") + MOVED[i][1] + "#" + id;
      }
    }
    return null;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      movedTarget: movedTarget,
      parseStatus: parseStatus,
      formatTime: formatTime,
      formatDuration: formatDuration,
      parseDevelopment: parseDevelopment,
      formatAge: formatAge,
      githubUrl: githubUrl,
      laneVisible: laneVisible,
      classVisible: classVisible,
      countByStatus: countByStatus,
      areaOrder: areaOrder,
      areaFromRow: areaFromRow,
    };
  } else if (typeof document !== "undefined") {
    var moved = movedTarget(window.location.pathname, window.location.hash);
    if (moved && !document.getElementById(window.location.hash.slice(1))) {
      window.location.replace(moved);
      return;
    }
    var roots = ["live", "status-badge"].map(function (id) { return document.getElementById(id); })
      .filter(function (root) { return root && root.dataset.api; });
    if (roots.length && typeof fetch === "function") {
      refresh(roots);
      window.setInterval(function () { refresh(roots); }, INTERVAL_MS);
    }
    var development = document.getElementById("development");
    if (development && development.dataset.api && development.dataset.repo && typeof fetch === "function") {
      refreshDevelopment(development);
      window.setInterval(function () { refreshDevelopment(development); }, DEV_INTERVAL_MS);
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-rail]"), enhanceRail);
    var hub = document.getElementById("lanes");
    if (hub) {
      enhanceHub(hub);
    } else {
      // A link to a folded card (/#before-buying, /#miners) opens it.
      var unfold = function () { openFolds(window.location.hash.slice(1)); };
      unfold();
      window.addEventListener("hashchange", unfold);
      // A click opens the fold before the browser scrolls, so it measures the page as it will be
      // (on /links/ opening one category closes the one above) and lands on the heading.
      document.addEventListener("click", function (event) {
        var link = event.target.closest ? event.target.closest("a[href^='#']") : null;
        if (!link || link.hash.length < 2) {
          return;
        }
        var id = decodeURIComponent(link.hash.slice(1));
        // In a contents list a second click on an open section folds it again.
        var target = document.getElementById(id);
        var own = target ? target.querySelector(":scope > details.c-fold") : null;
        if (own && own.open && link.closest("[data-rail], .c-jump")) {
          event.preventDefault();
          own.open = false;
          target.scrollIntoView();
          return;
        }
        openFolds(id, false);
      });
    }
    enhanceCopy();
  }
}());
