import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const listeners = {};
const frames = [];

class FakeIFrame {
  constructor(name) {
    this.name = name;
    this.contentWindow = { name };
    this.style = {};
    this.classList = { toggle() {} };
    this.attributes = new Map([["data-chart-name", name]]);
    this.card = {
      querySelector(selector) {
        const field = selector.match(/data-field="([^"]+)"/)?.[1];
        return {
          textContent: "",
          setAttribute() {},
          field
        };
      },
      getAttribute() {
        return name;
      }
    };
  }

  closest() {
    return this.card;
  }
}

const body = {
  querySelectorAll(selector) {
    return selector === "iframe" ? frames : [];
  }
};

const document = {
  readyState: "loading",
  addEventListener(type, callback) {
    listeners[`document:${type}`] = callback;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  getElementById(id) {
    if (id === "frame-count" || id === "resize-count") {
      return { textContent: "" };
    }
    if (id === "shrink-toggle") {
      return { checked: true, addEventListener() {} };
    }
    return null;
  },
  ...body
};

const window = {
  addEventListener(type, callback) {
    listeners[`window:${type}`] = callback;
  },
  getComputedStyle() {
    return { height: "450px" };
  },
  setTimeout() {},
  MessageEvent: class {
    constructor(type, init) {
      this.type = type;
      Object.assign(this, init);
    }
  }
};

const context = vm.createContext({
  console,
  document,
  window,
  HTMLIFrameElement: FakeIFrame,
  MessageEvent: window.MessageEvent,
  Set,
  WeakMap,
  Number,
  Object,
  String
});

vm.runInContext(source, context);
const demo = context.window.__resizeDemo;
const receive = listeners["window:message"];

const first = new FakeIFrame("first");
const second = new FakeIFrame("second");
frames.push(first, second);
demo.registerFrames(document);

assert.equal(demo.getTrackedFrameCount(), 2);
assert.equal(demo.getRecord(first).initialHeight, 450);
assert.equal(demo.getRecord(second).initialHeight, 450);

receive({
  origin: "https://www.reuters.com",
  source: first.contentWindow,
  data: { "datawrapper-height": { mismatchedChartId: 286 } }
});
assert.equal(first.style.height, "286px");
assert.equal(demo.getRecord(first).currentHeight, 286);
assert.equal(demo.getRecord(first).resizeCount, 1);
assert.equal(second.style.height, undefined);

receive({
  origin: "https://www.reuters.com",
  source: second.contentWindow,
  data: { "datawrapper-height": { anotherId: 328 } }
});
assert.equal(second.style.height, "328px");
assert.equal(demo.getRecord(second).resizeCount, 1);

const rejectedMessages = [
  { origin: "https://evil.example", source: first.contentWindow, data: { "datawrapper-height": { id: 100 } } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: null },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": null } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": { id: -1 } } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": { id: Infinity } } },
  { origin: "https://www.reuters.com", source: { name: "lookalike" }, data: { "datawrapper-height": { id: 999 } } }
];

for (const message of rejectedMessages) {
  receive(message);
}

assert.equal(first.style.height, "286px");
assert.equal(demo.getRecord(first).resizeCount, 1);
console.log("resize listener tests passed");
