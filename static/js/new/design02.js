// btx-community.com, design draft 02 (/new/design02/) only. community.js and ci.js fill the live
// data as on the live site; this adds what the draft has on top:
// 1. The A × B = C animation in the hero: one cell of C per 0.9 s, 16 steps, then again. It has a
//    pause button and starts paused when the reader asks for reduced motion.
// 2. Copy buttons on terminal blocks (Clipboard API).
// 3. The progress bar of a reading page follows the step the contents rail marks.
// 4. The directory filter: a text field and category chips, on the entries already on the page.
// 5. "/" opens the directory search; Escape closes the open menu.
// 6. The nightly CI panel: one tab per branch once ci.js has filled the runs.
// Only classes, attributes and textContent are touched; nothing is sent anywhere.
(function () {
  "use strict";

  var STEP_MS = 900;
  var COPIED_MS = 2000;

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // --- 1. Matrix animation ---

  function matrix() {
    var figure = document.querySelector("[data-mm]");
    if (!figure) {
      return;
    }
    var a = toArray(figure.querySelectorAll("[data-mm-a] > span"));
    var b = toArray(figure.querySelectorAll("[data-mm-b] > span"));
    var c = toArray(figure.querySelectorAll("[data-mm-c] > span"));
    var formula = figure.querySelector("[data-mm-formula]");
    var counter = figure.querySelector("[data-mm-step]");
    var toggle = figure.querySelector("[data-mm-toggle]");
    var label = toggle ? toggle.querySelector("[data-mm-label]") : null;
    if (a.length !== 16 || b.length !== 16 || c.length !== 16 || !toggle || !label) {
      return;
    }
    var step = 0;
    var timer = null;
    var reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) {
      reduced = false;
    }

    function draw() {
      var row = Math.floor(step / 4);
      var col = step % 4;
      a.forEach(function (cell, index) { cell.classList.toggle("d02-mm__c--a", Math.floor(index / 4) === row); });
      b.forEach(function (cell, index) { cell.classList.toggle("d02-mm__c--b", index % 4 === col); });
      c.forEach(function (cell, index) {
        cell.classList.toggle("d02-mm__c--done", index < step);
        cell.classList.toggle("d02-mm__c--now", index === step);
        cell.textContent = index <= step ? cell.getAttribute("data-value") : "·";
      });
      var terms = [];
      for (var k = 0; k < 4; k += 1) {
        terms.push(a[row * 4 + k].textContent + "·" + b[k * 4 + col].textContent);
      }
      formula.textContent = "c[" + row + "][" + col + "] = " + terms.join(" + ") + " = " + c[step].getAttribute("data-value");
      counter.textContent = pad(step + 1) + "/16";
    }

    function playing() {
      return timer !== null;
    }

    function show() {
      toggle.classList.toggle("is-paused", !playing());
      label.textContent = toggle.getAttribute(playing() ? "data-label-pause" : "data-label-play");
      toggle.setAttribute("title", label.textContent);
    }

    function play() {
      if (timer === null) {
        timer = window.setInterval(function () {
          // Hidden (narrow screen, or a background tab): do not count on.
          if (figure.offsetParent === null || document.hidden) {
            return;
          }
          step = (step + 1) % 16;
          draw();
        }, STEP_MS);
      }
      show();
    }

    function pause() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      show();
    }

    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      if (playing()) {
        pause();
      } else {
        play();
      }
    });
    draw();
    if (reduced) {
      pause();
    } else {
      play();
    }
  }

  // --- 2. Copy buttons ---

  function copyButtons() {
    var clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      return;
    }
    toArray(document.querySelectorAll("[data-d02-copy]")).forEach(function (button) {
      var id = button.getAttribute("data-d02-copy");
      var source = document.getElementById(id);
      if (!source) {
        return;
      }
      var status = document.querySelector('[data-d02-copy-status="' + id + '"]');
      var hint = document.querySelector('[data-d02-copy-hint="' + id + '"]');
      var label = button.textContent;
      var timer = 0;
      button.addEventListener("click", function () {
        var text = toArray(source.childNodes).filter(function (node) {
          return !(node.nodeType === 1 && node.getAttribute("aria-hidden") === "true");
        }).map(function (node) { return node.textContent; }).join("");
        clipboard.writeText(text).then(function () {
          button.textContent = button.getAttribute("data-copied") || label;
          if (status) {
            status.textContent = button.textContent;
          }
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            button.textContent = label;
            if (status) {
              status.textContent = "";
            }
          }, COPIED_MS);
        }, function () {
          // Copying was refused: select the text and show the hint, so the reader copies by hand.
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
    });
  }

  // --- 3. Progress bar ---

  function progress() {
    var box = document.querySelector("[data-progress]");
    var rail = document.querySelector("[data-rail]");
    if (!box || !rail || typeof MutationObserver !== "function") {
      return;
    }
    var segments = toArray(box.querySelectorAll(".d02-progress__seg"));
    var now = box.querySelector("[data-progress-now]");
    var links = toArray(rail.querySelectorAll("a[href^='#']"));
    function sync() {
      var current = 0;
      links.forEach(function (link, index) {
        if (link.getAttribute("aria-current") === "true") {
          current = index;
        }
      });
      segments.forEach(function (segment, index) { segment.classList.toggle("is-done", index <= current); });
      if (now) {
        now.textContent = pad(current + 1);
      }
    }
    new MutationObserver(sync).observe(rail, { attributes: true, attributeFilter: ["aria-current"], subtree: true });
    sync();
  }

  // --- 4. Directory filter ---

  function directory() {
    var bar = document.querySelector("[data-d02-filter]");
    if (!bar) {
      return;
    }
    var input = bar.querySelector("[data-d02-filter-input]");
    var shown = bar.querySelector("[data-d02-filter-shown]");
    var chips = toArray(bar.querySelectorAll("button[data-d02-cat]"));
    var sections = toArray(document.querySelectorAll("[data-d02-category]"));
    var total = 0;
    var entries = [];
    sections.forEach(function (section) {
      toArray(section.querySelectorAll(".d02-entry")).forEach(function (entry) {
        entries.push({ element: entry, section: section, text: entry.textContent.toLowerCase().replace(/\s+/g, " ") });
        total += 1;
      });
    });
    var category = "all";

    function apply() {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      var count = 0;
      entries.forEach(function (item) {
        var inCategory = category === "all" || item.section.getAttribute("data-d02-category") === category;
        var matches = words.every(function (word) { return item.text.indexOf(word) !== -1; });
        item.element.hidden = !(inCategory && matches);
        count += item.element.hidden ? 0 : 1;
      });
      // A category without a match keeps its heading (the contents rail points at it) and says so.
      sections.forEach(function (section) {
        var none = section.querySelector("[data-d02-none]");
        if (none) {
          none.hidden = section.querySelector(".d02-entry:not([hidden])") !== null;
        }
      });
      shown.textContent = bar.getAttribute("data-template").replace("{shown}", count).replace("{total}", total);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        category = chip.getAttribute("data-d02-cat");
        chips.forEach(function (other) { other.setAttribute("aria-pressed", String(other === chip)); });
        apply();
      });
    });
    input.addEventListener("input", apply);
    bar.hidden = false;
    apply();
    if (window.location.hash === "#filter") {
      input.focus();
    }
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#filter") {
        input.focus();
      }
    });
  }

  // --- 5. Keys ---

  function keys() {
    var search = document.querySelector("[data-search-link]");
    document.addEventListener("keydown", function (event) {
      var target = event.target;
      var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey && search) {
        var input = document.querySelector("[data-d02-filter-input]");
        event.preventDefault();
        if (input && input.offsetParent !== null) {
          input.focus();
        } else {
          window.location.href = search.getAttribute("href");
        }
      }
      if (event.key === "Escape") {
        toArray(document.querySelectorAll("details.d02-menu[open], details.d02-otp[open]")).forEach(function (open) {
          open.open = false;
          var summary = open.querySelector("summary");
          if (summary && open.contains(target)) {
            summary.focus();
          }
        });
      }
    });
    // A jump from the phone's step list closes it, so the step is not hidden behind it.
    toArray(document.querySelectorAll("details.d02-otp a[href^='#']")).forEach(function (link) {
      link.addEventListener("click", function () { link.closest("details").open = false; });
    });
  }

  // --- 6. CI tabs: one branch at a time once ci.js has written a block per run ---

  function ciTabs() {
    var root = document.getElementById("ci");
    var bar = root ? root.querySelector("[data-ci-tabs]") : null;
    if (!bar || typeof MutationObserver !== "function") {
      return;
    }
    var selected = 0;
    function draw() {
      var runs = toArray(root.querySelectorAll('[data-ci="run"]')).filter(function (run) {
        return run.getAttribute("aria-label");
      });
      while (bar.firstChild) {
        bar.removeChild(bar.firstChild);
      }
      bar.hidden = runs.length < 2;
      if (runs.length < 2) {
        runs.forEach(function (run) { run.removeAttribute("role"); });
        return;
      }
      selected = Math.min(selected, runs.length - 1);
      runs.forEach(function (run, index) {
        var id = "ci-run-" + index;
        run.id = id;
        run.setAttribute("role", "tabpanel");
        run.setAttribute("aria-labelledby", id + "-tab");
        run.hidden = index !== selected;
        var tab = document.createElement("button");
        tab.type = "button";
        tab.className = "d02-tab";
        tab.id = id + "-tab";
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", id);
        tab.setAttribute("aria-selected", String(index === selected));
        tab.tabIndex = index === selected ? 0 : -1;
        tab.textContent = run.getAttribute("aria-label");
        tab.addEventListener("click", function () {
          selected = index;
          draw();
          bar.children[index].focus();
        });
        tab.addEventListener("keydown", function (event) {
          var move = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (move) {
            event.preventDefault();
            selected = (index + move + runs.length) % runs.length;
            draw();
            bar.children[selected].focus();
          }
        });
        bar.appendChild(tab);
      });
    }
    var pending = false;
    var options = { attributes: true, attributeFilter: ["aria-label"], childList: true, subtree: true };
    var observer = new MutationObserver(function () {
      if (!pending) {
        pending = true;
        window.setTimeout(function () {
          pending = false;
          observer.disconnect();
          draw();
          observer.observe(root, options);
        }, 50);
      }
    });
    observer.observe(root, options);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      matrix();
      copyButtons();
      progress();
      directory();
      keys();
      ciTabs();
    });
  }
}());
