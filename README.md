# Arena Datawrapper resize demo

A dependency-free GitHub Pages prototype for resizing multiple Reuters-hosted
Datawrapper iframes in an Arena live blog.

## Run locally

No installation is needed. Open `index.html` in a browser, or serve the
repository with a static file server:

```sh
python3 -m http.server
```

Then open `http://localhost:8000`. The demo has no package manager, framework,
or runtime dependency.

## What the page proves

- A single readable `window.message` listener is installed in the page head,
  before either embed loads.
- The first Reuters iframe is in the HTML. The second is inserted after a
  short delay, mirroring Arena adding a live-blog card after the initial page
  load.
- The listener finds the sender with
  `iframe.contentWindow === event.source`, then changes only that iframe's
  height.
- Each card shows its starting height (450px) and current reported height.
- The **Narrow card** and **Wide card** controls make responsive testing
  easier. Browser resizing works too.

The two live embeds are:

1. `https://www.reuters.com/graphics/MARKETS-AUTOMATED/SHEIN-20260901/znvnowrampl/media-embed.html`
2. `https://www.reuters.com/graphics/BRV-BRV/mopazegqrva/media-embed.html`

## Arena page-furniture installation

Place the CSS correction and listener from `assets/styles.css` and
`assets/resize-demo.js` in Arena page furniture, where they load once per
page. Keep individual chart cards script-free:

```html
<iframe
  class="chart-frame"
  data-datawrapper-demo
  data-frame-name="descriptive-name"
  title="Chart description"
  src="https://www.reuters.com/graphics/.../media-embed.html"
  width="100%"
  height="450"
></iframe>
```

Arena's broad `min-height: 450px !important` prevents a chart from shrinking.
The prototype intentionally mirrors that rule, then corrects it only under
`#datawrapper-resize-demo .chart-frame`. In production, replace that wrapper
with a similarly narrow, page-furniture-owned selector. Do not remove
Arena's rule globally.

## Why match the sender window

The Reuters media-embed URL slug and Datawrapper's public chart ID can differ.
Looking up an iframe by an ID from the message can therefore target the wrong
element or no element at all. `iframe.contentWindow === event.source` directly
matches the browser window that sent the event, so it works for both the
initial iframe and later-injected cards without depending on either ID.

## Security choices

The listener ignores every message unless all of these conditions are true:

1. Its origin is exactly `https://www.reuters.com` or
   `https://datawrapper.dwcdn.net`.
2. The message is an object containing an object-shaped
   `datawrapper-height` payload.
3. The event source is the `contentWindow` of an iframe marked for this demo.
4. The reported height is a finite positive number.

Malformed, unrelated, and unapproved-origin messages do nothing.

## Prototype limits and production follow-ups

This prototype trusts only the two origins needed for these Reuters embeds and
uses a simple page-level selector. Before production use, confirm the actual
production sender origins in browser tooling; add only exact origins that are
required. Give the page-furniture selector a stable scope shared by every
eligible chart card, test with Arena's real delayed inserts and content
updates, and add site-level browser tests where the host project supports
them.

## Validation and deployment

The GitHub Actions workflow runs `node --check assets/resize-demo.js`,
`node --test tests/resize-demo.test.mjs`, and confirms the required static
files on pull requests and pushes. Pushes to `main` and this prototype branch
deploy through GitHub Pages. The first deployment requires the repository's
Pages source to be set to **GitHub Actions**; the workflow is prepared for
that setting.
