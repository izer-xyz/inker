(function () {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const STORAGE_KEY = "einkReaderEnabled";
  const SWIPE_THRESHOLD = 48;
  const PAGE_OVERLAP = 72;
  const STATUS_ID = "eink-reader-status";
  const STYLE_ID = "eink-reader-styles";
  const STATIC_POSITION_CLASS = "eink-reader-static-position";

  let enabled = false;
  let touchStart = null;
  let wheelAccumulator = 0;
  let statusTimer = null;
  let stickyObserver = null;
  const staticPositionElements = new Set();

  const contrastCss = `
    html.eink-reader-mode,
    html.eink-reader-mode body {
      background: #ffffff !important;
      color: #000000 !important;
    }

    html.eink-reader-mode body,
    html.eink-reader-mode body * {
      color: #000000 !important;
      border-color: #000000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    html.eink-reader-mode body :not(img):not(video):not(canvas):not(svg):not(path):not(iframe) {
      background-color: #ffffff !important;
    }

    html.eink-reader-mode body .${STATIC_POSITION_CLASS} {
      position: static !important;
      inset: auto !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
      z-index: auto !important;
    }

    html.eink-reader-mode a,
    html.eink-reader-mode a * {
      color: #000000 !important;
      text-decoration-line: underline !important;
      text-decoration-thickness: .75px !important;
      text-underline-offset: .08em !important;
    }

    html.eink-reader-mode img,
    html.eink-reader-mode video,
    html.eink-reader-mode canvas,
    html.eink-reader-mode svg {
      filter: grayscale(100%) contrast(1.12) !important;
    }

    html.eink-reader-mode input,
    html.eink-reader-mode textarea,
    html.eink-reader-mode select,
    html.eink-reader-mode button {
      background: #ffffff !important;
      color: #000000 !important;
      border: 2px solid #000000 !important;
      border-radius: 0 !important;
    }

    html.eink-reader-mode #${STATUS_ID} {
      all: initial !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      right: 16px !important;
      bottom: 16px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 9px 11px !important;
      border: 2px solid #000000 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font: 600 12px/1.2 system-ui, sans-serif !important;
      letter-spacing: .03em !important;
      box-shadow: 3px 3px 0 #000000 !important;
      user-select: none !important;
    }

    html.eink-reader-mode #${STATUS_ID} * {
      all: initial !important;
      color: #000000 !important;
      font: inherit !important;
    }

    html.eink-reader-mode #${STATUS_ID} button {
      cursor: pointer !important;
      border: 0 !important;
      background: transparent !important;
      color: #000000 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    html.eink-reader-mode #${STATUS_ID} button:focus-visible {
      outline: 2px solid #000000 !important;
      outline-offset: 2px !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-status-button {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font: 600 12px/1.2 system-ui, sans-serif !important;
      letter-spacing: .03em !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-dot {
      width: 8px !important;
      height: 8px !important;
      border-radius: 50% !important;
      background: #000000 !important;
    }

  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = contrastCss;
    (document.head || document.documentElement).appendChild(style);
  }

  function scanForStickyElements() {
    if (!document.body) return;

    for (const element of document.body.querySelectorAll("*")) {
      if (element.id === STATUS_ID) continue;
      if (staticPositionElements.has(element) && element.classList.contains(STATIC_POSITION_CLASS)) continue;

      const position = window.getComputedStyle(element).position;
      if (position !== "sticky" && position !== "fixed") continue;

      element.classList.add(STATIC_POSITION_CLASS);
      staticPositionElements.add(element);
    }
  }

  function startStickyObserver() {
    if (stickyObserver || !document.body) return;

    stickyObserver = new MutationObserver(function (mutations) {
      if (!enabled || !mutations.some((mutation) => mutation.addedNodes.length || mutation.attributeName)) {
        return;
      }
      scanForStickyElements();
    });
    stickyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true
    });
  }

  function stopStickyObserver() {
    if (stickyObserver) {
      stickyObserver.disconnect();
      stickyObserver = null;
    }
  }

  function restoreStickyElements() {
    stopStickyObserver();
    for (const element of staticPositionElements) {
      element.classList.remove(STATIC_POSITION_CLASS);
    }
    staticPositionElements.clear();
  }

  function ensureStatus() {
    let status = document.getElementById(STATUS_ID);
    if (status) return status;

    status = document.createElement("div");
    status.id = STATUS_ID;
    status.innerHTML = `
      <button class="eink-reader-status-button" type="button" title="Turn off e-ink reading mode">
        <span class="eink-reader-dot" aria-hidden="true"></span>
        <span data-role="label">PAGE MODE · ON</span>
      </button>
    `;
    status.querySelector(".eink-reader-status-button").addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setEnabled(false);
    });
    document.documentElement.appendChild(status);
    return status;
  }

  function removeStatus() {
    const status = document.getElementById(STATUS_ID);
    if (status) status.remove();
  }

  function getScrollLimit() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function goToPage(direction) {
    const current = window.scrollY;
    const step = Math.max(240, window.innerHeight - PAGE_OVERLAP);
    const limit = getScrollLimit();
    const target = Math.max(0, Math.min(limit, current + direction * step));

    if (Math.abs(target - current) < 4) {
      showStatus(direction > 0 ? "END OF PAGE" : "TOP OF PAGE");
      return;
    }

    window.scrollTo(0, target);
    showStatus(`${Math.round((target / Math.max(1, limit)) * 100)}% · PAGE MODE`);
  }

  function showStatus(message) {
    if (!enabled) return;
    const status = ensureStatus();
    const label = status.querySelector('[data-role="label"]');
    if (label) label.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      if (!enabled) return;
      const currentLabel = status.querySelector('[data-role="label"]');
      if (currentLabel) currentLabel.textContent = "PAGE MODE · ON";
    }, 1200);
  }

  function setEnabled(nextValue, persist) {
    enabled = Boolean(nextValue);
    ensureStyle();
    document.documentElement.classList.toggle("eink-reader-mode", enabled);

    if (enabled) {
      scanForStickyElements();
      startStickyObserver();
      ensureStatus();
      showStatus("PAGE MODE · ON");
    } else {
      restoreStickyElements();
      removeStatus();
      clearTimeout(statusTimer);
    }

    if (persist !== false && api?.storage?.local) {
      api.storage.local.set({ [STORAGE_KEY]: enabled });
    }
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) {
      touchStart = null;
      return;
    }
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(event) {
    if (!enabled || !touchStart || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    if (Math.abs(deltaY) > 16 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      event.preventDefault();
    }
  }

  function handleTouchEnd(event) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const isVertical = Math.abs(deltaY) >= SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
    touchStart = null;

    if (!isVertical) return;

    if (!enabled) {
      event.preventDefault();
      setEnabled(true);
      return;
    }

    event.preventDefault();
    goToPage(deltaY < 0 ? 1 : -1);
  }

  function handleWheel(event) {
    if (!enabled || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    wheelAccumulator += event.deltaY;

    if (Math.abs(wheelAccumulator) >= 60) {
      const direction = wheelAccumulator > 0 ? 1 : -1;
      wheelAccumulator = 0;
      goToPage(direction);
    }
  }

  function handleKeydown(event) {
    if (!enabled) return;
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

    if (event.key === "PageDown" || event.key === "ArrowDown" || event.key === " ") {
      event.preventDefault();
      goToPage(1);
    } else if (event.key === "PageUp" || event.key === "ArrowUp") {
      event.preventDefault();
      goToPage(-1);
    } else if (event.key === "Escape") {
      setEnabled(false);
    }
  }

  function onRuntimeMessage(message) {
    if (!message) return;
    if (message.type === "eink-reader:get-state") {
      return Promise.resolve({ enabled });
    }
    if (message.type !== "eink-reader:set-enabled") return;
    setEnabled(message.enabled);
    return Promise.resolve({ enabled });
  }

  ensureStyle();
  document.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
  document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
  document.addEventListener("keydown", handleKeydown, { capture: true });
  api?.runtime?.onMessage?.addListener(onRuntimeMessage);

  if (api?.storage?.local) {
    api.storage.local.get(STORAGE_KEY).then(function (result) {
      if (result && result[STORAGE_KEY]) setEnabled(true, false);
    }).catch(function () {
      // Private browsing can disable extension storage; swipe activation still works.
    });
  }
})();