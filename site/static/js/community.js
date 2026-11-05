// btx-community.com: fill the live strip from the public API of the status page
// (network.btx-monitoring.com/api/v1/status.json) on load and every 60 seconds after.
// Without JavaScript or without an answer the strip shows dashes. The API answer is validated
// before use and only ever written with textContent.
(function () {
  "use strict";

  var INTERVAL_MS = 60000;
  var MAX_HEIGHT = 100000000;
  var MAX_NODES = 1000000;
  var MAX_SECONDS = 365 * 86400;
  var OVERALL = ["normal", "degraded", "incident"];
  var LEVELS = ["green", "yellow", "red", "unknown"];
  var RELEASE = /^v?[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
  var DAY = { en: "d", de: "T" };

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

  function apply(root, status) {
    var locale = root.dataset.lang === "de" ? "de-DE" : "en-US";
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

  function refresh(root) {
    fetch(root.dataset.api, { cache: "no-store", credentials: "omit" })
      .then(function (response) { return response.ok ? response.text() : ""; })
      .then(function (text) {
        var status = parseStatus(text);
        if (status) {
          apply(root, status);
        }
      })
      .catch(function () { /* keep the values shown so far */ });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseStatus: parseStatus, formatTime: formatTime, formatDuration: formatDuration };
  } else if (typeof document !== "undefined") {
    var root = document.getElementById("live");
    if (root && root.dataset.api && typeof fetch === "function") {
      refresh(root);
      window.setInterval(function () { refresh(root); }, INTERVAL_MS);
    }
  }
}());
