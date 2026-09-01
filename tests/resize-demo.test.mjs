import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/resize-demo.js", import.meta.url), "utf8");

function createFrame(name, contentWindow) {
  return {
    contentWindow,
    dataset: { frameName: name, startingHeight: "450" },
    height: "450",
    style: {},
    getAttribute(attribute) {
      return attribute === "height" ? this.height : null;
    },
  };
}

function loadListener() {
  let messageListener;
  const firstSource = {};
  const secondSource = {};
  const frames = [createFrame("first", firstSource)];
  const statuses = {
    first: { textContent: "" },
    second: { textContent: "" },
  };

  const document = {
    addEventListener() {},
    body: { classList: { toggle() {} } },
    querySelector(selector) {
      const match = selector.match(/^\[data-frame-status="(.+)"\]$/);
      return match ? statuses[match[1]] : null;
    },
    querySelectorAll(selector) {
      return selector === "iframe[data-datawrapper-demo]" ? frames : [];
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
  assert.equal(statuses.first.textContent, "Starting height: 450px. Current height: 320px.");
});

test("handles a later-inserted iframe by sender window", () => {
  const { secondSource, frames, messageListener, statuses } = loadListener();
  const delayedFrame = createFrame("second", secondSource);
  frames.push(delayedFrame);

  messageListener({
    origin: "https://datawrapper.dwcdn.net",
    source: secondSource,
    data: { "datawrapper-height": { differentPublicChartId: 275 } },
  });

  assert.equal(delayedFrame.height, "275");
  assert.equal(statuses.second.textContent, "Starting height: 450px. Current height: 275px.");
});

test("ignores unapproved, malformed, and unrelated messages", () => {
  const { firstSource, frames, messageListener } = loadListener();
  const invalidEvents = [
    { origin: "https://example.com", source: firstSource, data: { "datawrapper-height": { chart: 320 } } },
    { origin: "https://www.reuters.com", source: firstSource, data: { "datawrapper-height": { chart: "320" } } },
    { origin: "https://www.reuters.com", source: firstSource, data: { "datawrapper-height": [320] } },
    { origin: "https://www.reuters.com", source: {}, data: { "datawrapper-height": { chart: 320 } } },
  ];

  for (const event of invalidEvents) {
    messageListener(event);
  }

  assert.equal(frames[0].height, "450");
  assert.equal(frames[0].style.height, undefined);
});
