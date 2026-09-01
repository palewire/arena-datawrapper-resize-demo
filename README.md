# Reuters Datawrapper resize prototype

This is a small proof of concept for Arena. Put this script once in the shared
page furniture that contains Reuters embeds:

```js
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
```

The listener accepts only messages from `https://www.reuters.com`. It requires
an object with a `datawrapper-height` object, takes its first finite positive
number, and resizes only the iframe whose `contentWindow` is the sending
window. It does not depend on iframe IDs, classes, or data attributes.

It scans all iframes when each message arrives, so a future Arena post inserted
after page load works without another listener or registration step.

Arena's iframe markup can keep its existing inline minimum:

```html
<iframe
  title="Reuters market chart"
  src="https://www.reuters.com/graphics/MARKETS-AUTOMATED/SHEIN-20260901/znvnowrampl/media-embed.html"
  style="width: 100%; min-height: 450px !important; border: 0;"
  loading="lazy"
></iframe>
```

The `setProperty` line is needed because an inline
`min-height: 450px !important` cannot be beaten by a stylesheet selector. It
clears that minimum only on the matched iframe, and can be removed if Arena
changes its CSS.

## Test

```bash
node tests/resize-listener.test.mjs
```

## Demo

After the Pages workflow deploys `main`, the demo is available at
<https://palewire.github.io/arena-datawrapper-resize-demo/>.
