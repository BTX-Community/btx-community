// btx-community.com, design draft 01 (/new/design01/) only. Loaded in <head> without defer, so
// the variant and the theme are set on <html> before the page is drawn.
// Variant: ?v=klar (default) or ?v=mono in the address; nothing is stored for it.
// Theme: "klar" starts light, "mono" starts dark; a choice made with the switch is kept in
// localStorage on this device, one per variant, and nothing else is stored or sent anywhere.
// Without JavaScript the page is "klar" and light.
(function () {
  "use strict";

  var root = document.documentElement;
  var match = /[?&]v=(klar|mono)(?:&|$)/.exec(window.location.search);
  var variant = match ? match[1] : "klar";
  var key = "btx-d01-theme-" + variant;

  function stored() {
    try {
      var value = window.localStorage.getItem(key);
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }

  root.setAttribute("data-variant", variant);
  root.setAttribute("data-theme", stored() || (variant === "mono" ? "dark" : "light"));

  function label(button) {
    var text = button.getAttribute(root.getAttribute("data-theme") === "dark" ? "data-to-light" : "data-to-dark");
    button.setAttribute("aria-label", text);
    button.setAttribute("title", text);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.querySelector("[data-d01-theme]");
    if (button) {
      button.hidden = false;
      label(button);
      button.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try {
          window.localStorage.setItem(key, next);
        } catch (error) {
          // Private mode or blocked storage: the switch still works until the page is left.
        }
        label(button);
      });
    }
    // Mark the variant switch, and keep ?v=mono on the links between pages of this draft.
    Array.prototype.forEach.call(document.querySelectorAll("[data-d01-variant]"), function (link) {
      if (link.getAttribute("data-d01-variant") === variant) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (variant === "mono") {
      var base = root.getAttribute("data-d01-base");
      Array.prototype.forEach.call(document.querySelectorAll("a[href]"), function (link) {
        var href = link.getAttribute("href");
        if (base && href.indexOf(base) === 0 && !link.hasAttribute("data-d01-variant")) {
          var parts = href.split("#");
          link.setAttribute("href", parts[0] + (parts[0].indexOf("?") < 0 ? "?" : "&") + "v=mono" + (parts.length > 1 ? "#" + parts[1] : ""));
        }
      });
    }
  });
}());
