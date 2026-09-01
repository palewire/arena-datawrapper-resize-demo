(() => {
  "use strict";

  const ALLOWED_MESSAGE_ORIGINS = new Set([
    "https://www.reuters.com",
    "https://datawrapper.dwcdn.net",
  ]);

  const injectedChart = {
    name: "brv",
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
   * Finds the demo iframe that sent a postMessage event.
   *
   * Args:
   *   source: The event source supplied by a MessageEvent.
   *
   * Returns:
   *   The matching iframe element, or null when the sender is not a demo frame.
   *
   * Example:
   *   findFrameBySource(frame.contentWindow) === frame
   */
  function findFrameBySource(source) {
    const frames = document.querySelectorAll("iframe[data-datawrapper-demo]");
    for (const frame of frames) {
      if (frame.contentWindow === source) {
        return frame;
      }
    }

    return null;
  }

  /**
   * Updates a card's visible current height.
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
    const startingHeight = frame.dataset.startingHeight || frame.getAttribute("height") || "450";
    frame.dataset.startingHeight = startingHeight;
    frame.height = String(height);
    frame.style.height = `${height}px`;

    const name = frame.dataset.frameName;
    const status = document.querySelector(`[data-frame-status="${name}"]`);
    if (status) {
      status.textContent = `Starting height: ${startingHeight}px. Current height: ${height}px.`;
    }
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
        <p class="frame-status" data-frame-status="${injectedChart.name}" aria-live="polite">
          Starting height: 450px. Current height: 450px.
        </p>
      </div>
      <iframe
        class="chart-frame"
        data-datawrapper-demo
        data-frame-name="${injectedChart.name}"
        title="${injectedChart.title}"
        src="${injectedChart.src}"
        width="100%"
        height="450"
        loading="lazy"
      ></iframe>
    `;

    anchor.append(card);
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
    for (const frame of document.querySelectorAll("iframe[data-datawrapper-demo]")) {
      frame.dataset.startingHeight = frame.getAttribute("height") || "450";
    }

    for (const button of document.querySelectorAll("[data-width]")) {
      button.addEventListener("click", () => setDemoWidth(button.dataset.width));
    }

    window.setTimeout(insertDelayedCard, 1800);
  });
})();
