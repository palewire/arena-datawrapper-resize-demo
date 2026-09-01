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
- The listener scans every iframe and finds the sender with
  `iframe.contentWindow === event.source`, then changes only that iframe's
  height. No chart ID, custom class, or custom data attribute is needed for
  resizing.
- Each card shows its starting height (450px) and current reported height.
- The **Narrow card** and **Wide card** controls make responsive testing
  easier. Browser resizing works too.

The two live embeds are:

1. `https://www.reuters.com/graphics/MARKETS-AUTOMATED/SHEIN-20260901/znvnowrampl/media-embed.html`
2. `https://www.reuters.com/graphics/BRV-BRV/mopazegqrva/media-embed.html`

## Arena page-furniture installation

Place the listener from `assets/resize-demo.js` in Arena page furniture, where
it loads once per page. Keep individual chart cards script-free and use
Arena's normal iframe markup:

```html
<iframe
  id="datawrapper-chart-..."
  data-external="1"
  title="Chart description"
  src="https://www.reuters.com/graphics/.../media-embed.html"
  width="100%"
  height="450"
  style="min-height: 450px !important"
></iframe>
```

Arena applies `min-height: 450px !important` inline on these iframes. A
stylesheet selector, no matter how specific, cannot override an inline
important declaration. After the listener has matched an approved Reuters
sender window and accepted a valid height, it replaces that one frame's inline
minimum with `frame.style.setProperty("min-height", "0px", "important")`.
This correction is limited to the exact frame that sent the accepted message.

## Why match the sender window

The Reuters media-embed URL slug and Datawrapper's public chart ID can differ.
Looking up an iframe by an ID from the message can therefore target the wrong
element or no element at all. `iframe.contentWindow === event.source` directly
matches the browser window that sent the event, so it works for both the
initial iframe and later-injected cards without depending on either ID.

## Security choices

The listener ignores every message unless all of these conditions are true:

1. Its origin is exactly `https://www.reuters.com`.
2. The message is an object containing an object-shaped
   `datawrapper-height` payload.
3. The event source is the `contentWindow` of an iframe on the page.
4. The reported height is a finite positive number.

Malformed, unrelated, and unapproved-origin messages do nothing.

## Prototype limits and production follow-ups

This prototype trusts only the Reuters origin used by these embeds and scans
the page's iframes only after that origin and message shape have been checked.
Before production use, confirm the actual production sender origin in browser
tooling; add another exact origin only when a demonstrated iframe needs it.
Test with Arena's real delayed inserts and content updates, and add site-level
browser tests where the host project supports them.

## Validation and deployment

The GitHub Actions workflow runs `node --check assets/resize-demo.js`,
`node --test tests/resize-demo.test.mjs`, and confirms the required static
files on pull requests and pushes. Pushes to `main` deploy through GitHub
Pages. The first deployment requires the repository's
Pages source to be set to **GitHub Actions**; the workflow is prepared for
that setting.
