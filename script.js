(function () {
  "use strict";

  // Keep this list exact. The Reuters media embed is the sender boundary for this demo.
  var ALLOWED_ORIGINS = new Set(["https://www.reuters.com"]);
  var frameRecords = new WeakMap();
  var trackedFrames = new Set();
  var acceptedResizeCount = 0;
  var defaultDemoHeight = 450;

  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function findHeight(heightData) {
    var values = Object.values(heightData);

    for (var index = 0; index < values.length; index += 1) {
      var value = values[index];

      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return null;
  }

  function getHeightText(height) {
    return height === null ? "-" : height + "px";
  }

  function renderRecord(frame) {
    var record = frameRecords.get(frame);

    if (!record || !record.card) {
      return;
    }

    record.card.querySelector('[data-field="initial"]').textContent = getHeightText(record.initialHeight);
    record.card.querySelector('[data-field="current"]').textContent = getHeightText(record.currentHeight);
    record.card.querySelector('[data-field="resizes"]').textContent = String(record.resizeCount);

    var status = record.card.querySelector('[data-field="status"]');
    status.textContent = record.resizeCount ? "Resized just now" : "Waiting for height";
    status.setAttribute("data-status", record.resizeCount ? "resized" : "waiting");

    document.getElementById("frame-count").textContent = String(trackedFrames.size);
    document.getElementById("resize-count").textContent = String(acceptedResizeCount);

    var previewText = document.querySelector('[data-preview="open"]');
    if (previewText && record.currentHeight !== null) {
      previewText.textContent = getHeightText(record.currentHeight);
    }
  }

  function getInitialHeight(frame) {
    var computedHeight = window.getComputedStyle(frame).height;
    var parsedHeight = Number.parseFloat(computedHeight);

    return Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : defaultDemoHeight;
  }

  function registerFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement) || trackedFrames.has(frame)) {
      return;
    }

    var card = frame.closest("[data-chart-name]");
    var initialHeight = getInitialHeight(frame);

    frameRecords.set(frame, {
      card: card,
      currentHeight: initialHeight,
      initialHeight: initialHeight,
      resizeCount: 0
    });
    trackedFrames.add(frame);
    renderRecord(frame);
  }

  function registerFrames(root) {
    if (root instanceof HTMLIFrameElement) {
      registerFrame(root);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll("iframe").forEach(registerFrame);
    }
  }

  function applyShrinkPreference() {
    var toggle = document.getElementById("shrink-toggle");
    var text = document.querySelector(".switch-text");

    trackedFrames.forEach(function (frame) {
      frame.classList.toggle("allow-received-height", toggle.checked);
    });
    text.textContent = toggle.checked ? "Scoped override on" : "Arena minimum on";
  }

  function resizeFromMessage(event) {
    if (!ALLOWED_ORIGINS.has(event.origin) || !isObject(event.data)) {
      return;
    }

    var heightData = event.data["datawrapper-height"];
    if (!isObject(heightData)) {
      return;
    }

    var height = findHeight(heightData);
    if (height === null) {
      return;
    }

    trackedFrames.forEach(function (frame) {
      if (frame.contentWindow !== event.source) {
        return;
      }

      var record = frameRecords.get(frame);
      frame.style.height = height + "px";
      record.currentHeight = height;
      record.resizeCount += 1;
      acceptedResizeCount += 1;
      renderRecord(frame);
    });
  }

  // Install the only message listener before the DOM iframes are parsed.
  window.addEventListener("message", resizeFromMessage);

  document.addEventListener("DOMContentLoaded", function () {
    registerFrames(document);
    document.getElementById("shrink-toggle").addEventListener("change", applyShrinkPreference);
    document.querySelectorAll("[data-test-message]").forEach(function (button) {
      button.addEventListener("click", function () {
        var frame = button.closest("[data-chart-name]").querySelector("iframe");
        window.dispatchEvent(new MessageEvent("message", {
          data: { "datawrapper-height": { demo: 286 } },
          origin: "https://www.reuters.com",
          source: frame.contentWindow
        }));
      });
    });
    applyShrinkPreference();

    var chartList = document.getElementById("chart-list");
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(registerFrames);
      });
    });
    observer.observe(chartList, { childList: true, subtree: true });

    window.setTimeout(function () {
      var card = document.createElement("article");
      card.className = "chart-card";
      card.setAttribute("data-chart-name", "BRV market chart");
      card.innerHTML = [
        '<div class="card-topline">',
        '  <span class="card-number">02</span>',
        '  <span class="card-status" data-field="status">Waiting for height</span>',
        "</div>",
        "<h3>BRV market chart</h3>",
        '<p class="card-description">Reuters &middot; BRV graphic &middot; inserted after load</p>',
        '<div class="frame-shell"><iframe class="datawrapper-frame allow-received-height" title="Reuters BRV market chart" src="https://www.reuters.com/graphics/BRV-BRV/mopazegqrva/media-embed.html"></iframe></div>',
        '<dl class="metrics" aria-live="polite">',
        '  <div><dt>Initial</dt><dd data-field="initial">-</dd></div>',
        '  <div><dt>Current</dt><dd data-field="current">-</dd></div>',
        '  <div><dt>Resizes</dt><dd data-field="resizes">0</dd></div>',
        "</dl>",
        '<button class="test-button" type="button" data-test-message>Send sample height</button>'
      ].join("");
      chartList.appendChild(card);
      card.querySelector("[data-test-message]").addEventListener("click", function () {
        var frame = card.querySelector("iframe");
        window.dispatchEvent(new MessageEvent("message", {
          data: { "datawrapper-height": { demo: 328 } },
          origin: "https://www.reuters.com",
          source: frame.contentWindow
        }));
      });
      applyShrinkPreference();
    }, 1200);
  });

  window.__resizeDemo = {
    getTrackedFrameCount: function () {
      return trackedFrames.size;
    },
    getRecord: function (frame) {
      return frameRecords.get(frame);
    },
    handleMessage: resizeFromMessage,
    registerFrames: registerFrames
  };
}());
