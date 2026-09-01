(() => {
  "use strict";

  const ALLOWED_MESSAGE_ORIGINS = new Set([
    "https://www.reuters.com",
  ]);

  const demoFrames = new WeakMap();

  const injectedChart = {
    title: "Reuters BRV chart",
    src: "https://www.reuters.com/graphics/BRV-BRV/mopazegqrva/media-embed.html",
  };

  /**
   * Returns a valid Datawrapper height from a message payload.
   *
   * Args:
   *   message: The value received through window.postMessage.
   *
   * Returns:
   *   A positive finite height, or null when the message is not a Datawrapper
   *   resize payload.
   *
   * Example:
   *   getDatawrapperHeight({"datawrapper-height": {chart: 320}}) === 320
   */
  function getDatawrapperHeight(message) {
    if (typeof message !== "object" || message === null || Array.isArray(message)) {
      return null;
    }

    const payload = message["datawrapper-height"];
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return null;
    }

    for (const height of Object.values(payload)) {
      if (typeof height === "number" && Number.isFinite(height) && height > 0) {
        return height;
      }
    }

    return null;
  }

  /**
   * Finds the iframe that sent a postMessage event.
   *
   * Args:
   *   source: The event source supplied by a MessageEvent.
   *
   * Returns:
   *   The matching iframe element, or null when the sender is not an iframe.
   *
   * Example:
   *   findFrameBySource(frame.contentWindow) === frame
   */
  function findFrameBySource(source) {
    const frames = document.querySelectorAll("iframe");
    for (const frame of frames) {
      if (frame.contentWindow === source) {
        return frame;
      }
    }

    return null;
  }

  /**
   * Applies a validated height and updates an optional demo status.
   *
   * Args:
   *   frame: The iframe that received a resize message.
   *   height: The validated height to display and apply.
   *
   * Returns:
   *   Nothing.
   *
   * Example:
   *   updateFrameHeight(frame, 320)
   */
  function updateFrameHeight(frame, height) {
    frame.style.setProperty("min-height", "0px", "important");
    frame.height = String(height);
    frame.style.height = `${height}px`;

    const demoFrame = demoFrames.get(frame);
    if (demoFrame) {
      demoFrame.status.textContent =
        `Starting height: ${demoFrame.startingHeight}px. Current height: ${height}px.`;
    }
  }

  /**
   * Tracks a frame only for this page's status display.
   *
   * Args:
   *   frame: The demo iframe to track.
   *   status: The status element paired with the iframe.
   *
   * Returns:
   *   Nothing.
   *
   * Example:
   *   trackDemoFrame(frame, status)
   */
  function trackDemoFrame(frame, status) {
    if (!frame || !status) {
      return;
    }

    demoFrames.set(frame, {
      startingHeight: frame.getAttribute("height") || "450",
      status,
    });
  }

  // Register immediately, before either iframe has a chance to finish loading.
  window.addEventListener("message", (event) => {
    if (!ALLOWED_MESSAGE_ORIGINS.has(event.origin)) {
      return;
    }

    const height = getDatawrapperHeight(event.data);
    if (height === null) {
      return;
    }

    const frame = findFrameBySource(event.source);
    if (frame === null) {
      return;
    }

    updateFrameHeight(frame, height);
  });

  /**
   * Adds the second iframe after page load, like an Arena live-blog card.
   *
   * Args:
   *   None.
   *
   * Returns:
   *   Nothing.
   *
   * Example:
   *   insertDelayedCard()
   */
  function insertDelayedCard() {
    const anchor = document.querySelector("#injected-card-anchor");
    const insertionStatus = document.querySelector("#insertion-status");
    if (!anchor || !insertionStatus) {
      return;
    }

    const card = document.createElement("article");
    card.className = "arena-card";
    card.innerHTML = `
      <div class="card-label">
        <h2>Arena-style delayed card</h2>
        <p class="frame-status" aria-live="polite">
          Starting height: 450px. Current height: 450px.
        </p>
      </div>
      <iframe
        id="datawrapper-chart-brv"
        data-external="1"
        title="${injectedChart.title}"
        src="${injectedChart.src}"
        width="100%"
        height="450"
        style="min-height: 450px !important"
      ></iframe>
    `;

    anchor.append(card);
    trackDemoFrame(card.querySelector("iframe"), card.querySelector(".frame-status"));
    insertionStatus.textContent =
      "The second card was inserted after page load. The same listener now handles it.";
  }

  /**
   * Sets the simulated Arena card width.
   *
   * Args:
   *   width: Either "narrow" or "wide".
   *
   * Returns:
   *   Nothing.
   *
   * Example:
   *   setDemoWidth("narrow")
   */
  function setDemoWidth(width) {
    document.body.classList.toggle("viewport-narrow", width === "narrow");

    for (const button of document.querySelectorAll("[data-width]")) {
      button.setAttribute("aria-pressed", String(button.dataset.width === width));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    trackDemoFrame(
      document.querySelector(".arena-card iframe"),
      document.querySelector("[data-frame-status=\"shein\"]"),
    );

    for (const button of document.querySelectorAll("[data-width]")) {
      button.addEventListener("click", () => setDemoWidth(button.dataset.width));
    }

    window.setTimeout(insertDelayedCard, 1800);
  });
})();
