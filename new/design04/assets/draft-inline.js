// Moved out of the <head> of every page by site/tools/import_draft.py (CSP: no inline script).
    /* Motion and QA flags before first paint (the site is dark only). Same block on every page. */
    (function () {
      var d = document.documentElement, q = window.location.search;
      d.className += " js";
      if (/[?&]motion=off\b/.test(q) || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { d.setAttribute("data-motion", "off"); }
      if (/[?&]qa=1\b/.test(q)) {
        var errs = window.__qaErrors = [];
        window.addEventListener("error", function (e) {
          errs.push(e.message ? "error: " + e.message + " (" + (e.filename || "") + ":" + (e.lineno || "") + ")" : "resource failed: " + ((e.target && (e.target.src || e.target.href)) || "unknown"));
        }, true);
        window.addEventListener("unhandledrejection", function (e) { errs.push("unhandled rejection: " + (e.reason && e.reason.message || e.reason)); });
        var ce = console.error;
        console.error = function () { errs.push("console.error: " + Array.prototype.join.call(arguments, " ")); return ce.apply(console, arguments); };
      }
      window.setTimeout(function () { if (!window.BTX) { d.classList.remove("js"); } }, 4000);
    })();
  
