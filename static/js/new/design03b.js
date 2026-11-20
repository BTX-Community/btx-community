// btx-community.com, design draft 03b (/new/design03b/) only, a copy of draft 03's script: two
// small additions on top of community.js and ci.js, which fill the live data as on the live site.
// 1. The nightly CI-0 panel: ci.js writes one block per branch; this turns them into tabs, one
//    branch at a time, newest release first. Without JavaScript the blocks stack.
// 2. "On this page" on narrow screens names the section the reader is in, and closes after a jump.
// Only attributes and textContent are touched; nothing is sent anywhere.
(function () {
  "use strict";

  function toArray(list) {
    return Array.prototype.slice.call(list);
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
        tab.className = "tab";
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
    var box = document.querySelector("[data-otp]");
    var label = box ? box.querySelector("[data-otp-current]") : null;
    var rail = document.querySelector("[data-rail]");
    if (!box || !label || !rail || typeof MutationObserver !== "function") {
      return;
    }
    function sync() {
      var current = rail.querySelector('.rail__sec[aria-current="true"]');
      if (current) {
        label.textContent = current.firstChild ? current.firstChild.textContent.trim() : current.textContent;
      }
    }
    new MutationObserver(sync).observe(rail, { attributes: true, attributeFilter: ["aria-current"], subtree: true });
    toArray(box.querySelectorAll("a[href^='#']")).forEach(function (link) {
      link.addEventListener("click", function () { box.open = false; });
    });
    sync();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      ciTabs();
      onThisPage();
    });
  }
}());
