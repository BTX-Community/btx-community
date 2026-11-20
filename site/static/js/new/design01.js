// btx-community.com, design draft 01 (/new/design01/) only: small additions on top of
// community.js and ci.js, which fill the live data as on the live site.
// 1. Directory: a filter field and category chips that show and hide the entries already on the
//    page, with a count "x of y shown". Nothing is sent anywhere.
// 2. Install checklist: starts with the first few checks and a button "Show all N checks".
// 3. Nightly CI-0 panel: ci.js writes one block per branch; this turns them into tabs.
// 4. "On this page" on narrow screens closes after a jump.
// Without JavaScript every entry, every check and every run is shown.
(function () {
  "use strict";

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function directory() {
    var bar = document.querySelector("[data-d01-filter]");
    if (!bar) {
      return;
    }
    var input = bar.querySelector("[data-d01-query]");
    var chips = toArray(bar.querySelectorAll("[data-d01-cat]"));
    var shown = bar.querySelector("[data-d01-shown]");
    var entries = toArray(document.querySelectorAll("[data-d01-entry]"));
    var sections = toArray(document.querySelectorAll("[data-d01-cat-section]"));
    var empty = document.querySelector("[data-d01-empty]");
    var jump = document.querySelector("[data-d01-jump]");
    var category = "all";
    var texts = entries.map(function (entry) { return entry.textContent.toLowerCase().replace(/\s+/g, " "); });

    function apply() {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      var count = 0;
      entries.forEach(function (entry, index) {
        var visible = (category === "all" || entry.getAttribute("data-cat") === category) &&
          words.every(function (word) { return texts[index].indexOf(word) >= 0; });
        entry.hidden = !visible;
        if (visible) {
          count += 1;
        }
      });
      sections.forEach(function (section) {
        section.hidden = section.querySelector("[data-d01-entry]:not([hidden])") === null;
      });
      chips.forEach(function (chip) {
        chip.setAttribute("aria-pressed", String(chip.getAttribute("data-d01-cat") === category));
      });
      shown.textContent = count + " of " + shown.getAttribute("data-total") + " shown";
      empty.hidden = count > 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        category = chip.getAttribute("data-d01-cat");
        apply();
      });
    });
    input.addEventListener("input", apply);
    bar.hidden = false;
    if (jump) {
      jump.hidden = true;
    }
    // A link to one category (/links/#cat-wallets) picks its chip, so the target is the first thing shown.
    function fromHash() {
      var match = /^#cat-([a-z0-9-]+)$/.exec(window.location.hash);
      if (match && chips.some(function (chip) { return chip.getAttribute("data-d01-cat") === match[1]; })) {
        category = match[1];
        input.value = "";
        apply();
        var target = document.getElementById("cat-" + match[1]);
        if (target) {
          target.scrollIntoView();
        }
      }
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  function checks() {
    toArray(document.querySelectorAll("[data-d01-checks]")).forEach(function (list) {
      var button = list.parentNode.querySelector("[data-d01-show-all]");
      var limit = parseInt(list.getAttribute("data-show"), 10) || 4;
      var items = toArray(list.children);
      if (!button || items.length <= limit || window.location.hash === "#" + list.parentNode.id) {
        return;
      }
      items.forEach(function (item, index) { item.hidden = index >= limit; });
      button.hidden = false;
      button.addEventListener("click", function () {
        items.forEach(function (item) { item.hidden = false; });
        button.hidden = true;
        var next = items[limit].querySelector("input");
        if (next) {
          next.focus();
        }
      });
    });
  }

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
        tab.className = "tabs2__tab";
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
          var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (step) {
            event.preventDefault();
            selected = (index + step + runs.length) % runs.length;
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

  function onThisPage() {
    toArray(document.querySelectorAll("[data-otp]")).forEach(function (box) {
      toArray(box.querySelectorAll("a[href^='#']")).forEach(function (link) {
        link.addEventListener("click", function () { box.open = false; });
      });
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      directory();
      checks();
      ciTabs();
      onThisPage();
    });
  }
}());
