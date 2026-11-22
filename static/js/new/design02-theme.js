// btx-community.com, design draft 02 (/new/design02/) only: the dark and light theme. Loaded in
// <head> without defer, so a stored choice is set on <html> before the page is drawn. Without a
// stored choice, and without JavaScript, the draft is dark. The choice is kept in localStorage on
// this device only, under its own key, so it does not change the theme of the live site.
(function () {
  "use strict";

  var KEY = "btx-draft02-theme";
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
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  // The button says what a click does ("Switch to light theme").
  function label(button) {
    var text = button.getAttribute(current() === "dark" ? "data-to-light" : "data-to-dark");
    button.setAttribute("aria-label", text);
    button.setAttribute("title", text);
  }

  root.setAttribute("data-theme", stored() || "dark");

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
