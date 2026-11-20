// btx-community.com: the light and dark theme. Loaded in <head> without defer, so a stored choice
// is set on <html> before the page is drawn and the page does not flash in the other theme.
// Without a stored choice, and without JavaScript, the page is light.
// The choice is kept in localStorage on this device only; nothing is sent anywhere.
(function () {
  "use strict";

  var KEY = "btx-theme";
  var root = document.documentElement;

  function stored() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function current() {
    var chosen = root.getAttribute("data-theme");
    if (chosen === "light" || chosen === "dark") {
      return chosen;
    }
    return "light";
  }

  // The button says what a click does ("Switch to light theme"), in the page's language.
  function label(button) {
    var text = button.getAttribute(current() === "dark" ? "data-to-light" : "data-to-dark");
    button.setAttribute("aria-label", text);
    button.setAttribute("title", text);
  }

  var choice = stored();
  if (choice) {
    root.setAttribute("data-theme", choice);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.querySelector("[data-theme-switch]");
    if (!button) {
      return;
    }
    button.hidden = false;
    label(button);
    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(KEY, next);
      } catch (error) {
        // Private mode or blocked storage: the switch still works until the page is left.
      }
      label(button);
    });
  });
})();
