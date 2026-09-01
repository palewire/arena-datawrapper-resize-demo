import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/resize-demo.js", import.meta.url), "utf8");

function createFrame(contentWindow) {
  return {
    contentWindow,
    height: "450",
    style: {
      setProperty(name, value, priority) {
        this[name] = value;
        this[`${name}-priority`] = priority;
      },
    },
    getAttribute(attribute) {
      return attribute === "height" ? this.height : null;
    },
  };
}

function loadListener() {
  let messageListener;
  let domContentLoadedListener;
  const firstSource = {};
  const secondSource = {};
  const frames = [createFrame(firstSource)];
  const statuses = {
    first: { textContent: "" },
  };

  const document = {
    addEventListener(type, listener) {
      if (type === "DOMContentLoaded") {
        domContentLoadedListener = listener;
      }
    },
    body: { classList: { toggle() {} } },
    querySelector(selector) {
      if (selector === ".arena-card iframe") {
        return frames[0];
      }

      return selector === '[data-frame-status="shein"]' ? statuses.first : null;
    },
    querySelectorAll(selector) {
      return selector === "iframe" ? frames : [];
    },
  };

  const window = {
    addEventListener(type, listener) {
      if (type === "message") {
        messageListener = listener;
      }
    },
    setTimeout() {},
  };

  vm.runInNewContext(source, { document, window, Object, Set, Array, Number, String });
  domContentLoadedListener();
  return { firstSource, secondSource, frames, messageListener, statuses };
}

test("resizes the matching iframe from an approved Reuters message", () => {
  const { firstSource, frames, messageListener, statuses } = loadListener();

  messageListener({
    origin: "https://www.reuters.com",
    source: firstSource,
    data: { "datawrapper-height": { publicChartId: 320 } },
  });

  assert.equal(frames[0].height, "320");
  assert.equal(frames[0].style.height, "320px");
  assert.equal(frames[0].style["min-height"], "0px");
  assert.equal(frames[0].style["min-height-priority"], "important");
  assert.equal(statuses.first.textContent, "Starting height: 450px. Current height: 320px.");
});

test("handles an unmarked later-inserted iframe by sender window", () => {
  const { secondSource, frames, messageListener } = loadListener();
  const delayedFrame = createFrame(secondSource);
  frames.push(delayedFrame);

  messageListener({
    origin: "https://www.reuters.com",
    source: secondSource,
    data: { "datawrapper-height": { differentPublicChartId: 275 } },
  });

  assert.equal(delayedFrame.height, "275");
  assert.equal(delayedFrame.style["min-height"], "0px");
  assert.equal(delayedFrame.style["min-height-priority"], "important");
});

test("ignores unapproved, malformed, and unrelated messages", () => {
  const { firstSource, frames, messageListener } = loadListener();
  const invalidEvents = [
    { origin: "https://example.com", source: firstSource, data: { "datawrapper-height": { chart: 320 } } },
    { origin: "https://datawrapper.dwcdn.net", source: firstSource, data: { "datawrapper-height": { chart: 320 } } },
    { origin: "https://www.reuters.com", source: firstSource, data: { "datawrapper-height": { chart: "320" } } },
    { origin: "https://www.reuters.com", source: firstSource, data: { "datawrapper-height": [320] } },
    { origin: "https://www.reuters.com", source: {}, data: { "datawrapper-height": { chart: 320 } } },
  ];

  for (const event of invalidEvents) {
    messageListener(event);
  }

  assert.equal(frames[0].height, "450");
  assert.equal(frames[0].style.height, undefined);
  assert.equal(frames[0].style["min-height"], undefined);
});
