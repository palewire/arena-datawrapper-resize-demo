# Reuters Datawrapper resize demo

This prototype shows how one global `window.message` listener can resize every Reuters-hosted Datawrapper iframe on an Arena live-blog page. The first chart is present at page load; the second is inserted later to model a live-blog card arriving after the page has already started.

## Problem

Datawrapper sends a `postMessage` containing the rendered chart height. Arena page furniture can apply `min-height: 450px !important` to an iframe or its card. That is useful for a stable initial layout, but it can stop a short chart from shrinking after Datawrapper reports its real height.

The demo keeps the stable Arena furniture visible while showing the narrowly scoped CSS override that allows a received height below 450px. Use the control in the page to compare both modes.

## Confirmed DOM architecture

The parent document owns the chart iframes. Each iframe is a direct child of a chart card and has a Reuters URL:

```text
document
`-- #chart-list
    |-- article.chart-card
    |   `-- iframe.datawrapper-frame
    `-- article.chart-card (inserted after load)
        `-- iframe.datawrapper-frame
```

The resize script runs in the parent document. It does not run inside Reuters or Datawrapper and does not depend on a chart ID.

## How the listener works

`script.js` installs one listener immediately while the script is loaded in `<head>`, before the body iframes exist. It then:

1. Rejects messages whose origin is not exactly `https://www.reuters.com`.
2. Requires a non-null object `event.data` and a non-null object `event.data["datawrapper-height"]`.
3. Finds the sender only when `iframe.contentWindow === event.source`.
4. Accepts only finite, positive numeric height values and writes `${height}px` to that iframe.
5. Records initial height, latest received height, and resize count for the card UI.
6. Uses a `MutationObserver` so dynamically inserted live-blog cards are registered without adding more message listeners.

The demo allowlist intentionally contains only the exact Reuters origin used by these embeds. `https://datawrapper.dwcdn.net` is not included because these Reuters media embeds are the documented sender boundary for this prototype; add it only after confirming that the production embed actually sends from that origin.

## Exact Arena page-furniture integration

Keep the shared page furniture selector narrow. The existing Arena rule can remain the default:

```css
.arena-card iframe {
  min-height: 450px !important;
}
```

For the cards that should honor Datawrapper's measured height, add a class at the chart-card boundary and override only those iframe elements:

```css
.arena-card.arena-card--datawrapper iframe.datawrapper-frame {
  min-height: 0 !important;
}
```

This demo uses the equivalent scoped rule `.resize-demo .datawrapper-frame.allow-received-height`, toggled by the visible control. The rule changes only the Datawrapper frames in this demo; it does not weaken unrelated Arena embeds.

## Script-free post iframe example

Once the shared listener is part of Arena's page shell, an individual card needs only the iframe markup. No per-iframe resize script is required:

```html
<article class="arena-card arena-card--datawrapper">
  <iframe
    class="datawrapper-frame"
    title="Reuters market chart"
    src="https://www.reuters.com/graphics/MARKETS-AUTOMATED/SHEIN-20260901/znvnowrampl/media-embed.html"
    loading="lazy"
  ></iframe>
</article>
```

The shared listener sees the iframe's `contentWindow` when the message arrives, including for a card appended after page load.

## Why chart IDs are not used

The key inside `datawrapper-height` is a Datawrapper chart identifier, while the DOM can contain an Arena wrapper, a rewritten iframe URL, or a different local identifier. Those values are not a reliable join key. The browser already provides a stronger relationship: `event.source` is the exact window that sent the message. Matching it to `iframe.contentWindow` avoids collisions and supports dynamically inserted frames.

## Security

The listener ignores malformed payloads, unrelated messages, unknown origins, non-numeric heights, zero, negative values, `Infinity`, and `NaN`. It never trusts a chart ID, accepts only the exact demo sender origin, and changes only the matched iframe. Production should keep the origin list explicit and review it whenever the embed architecture changes.

## Run and test

No build step or package install is needed. Serve the repository over HTTP so the browser can load the external embeds:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/>. The page includes a control that dispatches representative accepted and rejected messages, and the second chart appears automatically after a short delay.

Run the dependency-free Node test harness with:

```bash
node tests/resize-listener.test.mjs
```

It exercises initial and dynamically inserted frames, malformed messages, wrong origins, wrong sources, and valid resize isolation.

## Prototype limits

- The external Reuters pages may be unavailable, rate-limited, or changed by their owners.
- The test button simulates the sender event; a real Reuters/Datawrapper message still depends on the embed.
- The prototype records the first numeric value in the height object because the sender payload can use a chart ID that the parent must not trust.
- There is no production telemetry, consent handling, timeout policy, or iframe loading fallback.

## Production-hardening checklist

- Confirm the complete set of production sender origins with the embed owners.
- Keep the origin allowlist exact and covered by an integration test.
- Decide whether a maximum height and a minimum usable height are appropriate for the product.
- Keep the listener in the shared Arena shell and remove per-card resize listeners.
- Verify the actual Arena card selector and scope the `min-height` override to approved Datawrapper cards.
- Test cards inserted by every live-blog rendering path.
- Monitor rejected message counts and unexpected payload shapes without logging sensitive data.
- Recheck iframe permissions, CSP, referrer policy, and accessibility labels before launch.

## Demo URL

After the Pages workflow runs, the site will be available at:

<https://palewire.github.io/arena-datawrapper-resize-demo/>
