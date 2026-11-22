// btx-community.com: a page that moved. Its old folder forwards to the new one and keeps the
// #anchor of the link (/docs/#doc-venue-structure -> /projects/#doc-venue-structure); the meta
// refresh in the page does the same without the anchor when JavaScript is off.
(function () {
  "use strict";

  var link = document.querySelector("a[data-moved]");
  if (link) {
    window.location.replace(link.getAttribute("href") + window.location.hash);
  }
})();
