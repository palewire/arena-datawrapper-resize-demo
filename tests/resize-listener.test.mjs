import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const listeners = {};
const frames = [];

class FakeIFrame {
  constructor(name) {
    this.contentWindow = { name };
    this.style = {
      setProperty(property, value, priority) {
        this[property] = value;
        this[`${property}Priority`] = priority;
      }
    };
  }
}

const document = {
  querySelectorAll(selector) {
    return selector === "iframe" ? frames : [];
  }
};

const window = {
  addEventListener(type, callback) {
    listeners[type] = callback;
  }
};

vm.runInContext(
  source,
  vm.createContext({ document, window, Number, Object }),
);

const receive = listeners.message;
const first = new FakeIFrame("first");
const second = new FakeIFrame("second");
frames.push(first);

receive({
  origin: "https://www.reuters.com",
  source: first.contentWindow,
  data: { "datawrapper-height": { changedId: 286 } }
});
assert.equal(first.style.height, "286px");
assert.equal(first.style["min-height"], "0px");
assert.equal(first.style["min-heightPriority"], "important");

frames.push(second);
receive({
  origin: "https://www.reuters.com",
  source: second.contentWindow,
  data: { "datawrapper-height": { anotherChangedId: 328 } }
});
assert.equal(second.style.height, "328px");

const rejectedMessages = [
  { origin: "https://evil.example", source: first.contentWindow, data: { "datawrapper-height": { id: 100 } } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: null },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": null } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": { id: 0 } } },
  { origin: "https://www.reuters.com", source: first.contentWindow, data: { "datawrapper-height": { id: Infinity } } },
  { origin: "https://www.reuters.com", source: { name: "lookalike" }, data: { "datawrapper-height": { id: 999 } } }
];

for (const message of rejectedMessages) {
  receive(message);
}

assert.equal(first.style.height, "286px");
assert.equal(second.style.height, "328px");
console.log("resize listener tests passed");
