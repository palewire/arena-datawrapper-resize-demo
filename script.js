(function () {
  "use strict";

  window.addEventListener("message", function (event) {
    var data = event.data;
    var heightData = data && data["datawrapper-height"];

    if (
      event.origin !== "https://www.reuters.com" ||
      typeof data !== "object" ||
      data === null ||
      typeof heightData !== "object" ||
      heightData === null
    ) {
      return;
    }

    var height = Object.values(heightData).find(function (value) {
      return typeof value === "number" && Number.isFinite(value) && value > 0;
    });
    if (height === undefined) {
      return;
    }

    document.querySelectorAll("iframe").forEach(function (iframe) {
      if (iframe.contentWindow !== event.source) {
        return;
      }

      iframe.style.height = height + "px";
      // Override Arena's inline important minimum; remove if Arena changes that CSS.
      iframe.style.setProperty("min-height", "0px", "important");
    });
  });
}());
