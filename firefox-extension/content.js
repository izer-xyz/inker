(function () {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const STORAGE_KEY = "einkReaderEnabled";
  const SWIPE_THRESHOLD = 48;
  const PAGE_OVERLAP = 72;
  const STATUS_ID = "eink-reader-status";
  const STYLE_ID = "eink-reader-styles";
  const ZOOM_STORAGE_KEY = "einkReaderZoom";
  const MIN_ZOOM = 75;
  const MAX_ZOOM = 150;
  const ZOOM_STEP = 10;

  let enabled = false;
  let zoomLevel = 100;
  let touchStart = null;
  let wheelAccumulator = 0;
  let statusTimer = null;

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

    html.eink-reader-mode a,
    html.eink-reader-mode a * {
      color: #000000 !important;
      text-decoration-line: underline !important;
      text-decoration-thickness: 1px !important;
      text-underline-offset: .11em !important;
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

    html.eink-reader-mode #${STATUS_ID} .eink-reader-zoom {
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      padding-left: 8px !important;
      border-left: 1px solid #000000 !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-zoom-button {
      width: 22px !important;
      height: 22px !important;
      border: 1px solid #000000 !important;
      font: 700 16px/18px system-ui, sans-serif !important;
      text-align: center !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-zoom-button:hover {
      background: #000000 !important;
      color: #ffffff !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-zoom-value {
      min-width: 38px !important;
      font: 600 11px/1 system-ui, sans-serif !important;
      text-align: center !important;
    }
  `;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = contrastCss;
    (document.head || document.documentElement).appendChild(style);
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
      <div class="eink-reader-zoom" role="group" aria-label="Text size">
        <button class="eink-reader-zoom-button" data-action="zoom-out" type="button" title="Zoom out" aria-label="Zoom out">−</button>
        <span class="eink-reader-zoom-value" data-role="zoom-value">100%</span>
        <button class="eink-reader-zoom-button" data-action="zoom-in" type="button" title="Zoom in" aria-label="Zoom in">+</button>
      </div>
    `;
    status.querySelector(".eink-reader-status-button").addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setEnabled(false);
    });
    status.querySelector('[data-action="zoom-out"]').addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setZoom(zoomLevel - ZOOM_STEP);
    });
    status.querySelector('[data-action="zoom-in"]').addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setZoom(zoomLevel + ZOOM_STEP);
    });
    document.documentElement.appendChild(status);
    updateControls();
    return status;
  }

  function removeStatus() {
    const status = document.getElementById(STATUS_ID);
    if (status) status.remove();
  }

  function getScrollLimit() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function getPaginationStep() {
    const scale = zoomLevel / 100;
    const viewportHeight = window.innerHeight / scale;
    const overlap = PAGE_OVERLAP / scale;
    return Math.max(240 / scale, viewportHeight - overlap);
  }

  function goToPage(direction) {
    const current = window.scrollY;
    const step = getPaginationStep();
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

  function normalizeZoom(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 100;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(number / ZOOM_STEP) * ZOOM_STEP));
  }

  function updateControls() {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    const zoomValue = status.querySelector('[data-role="zoom-value"]');
    if (zoomValue) zoomValue.textContent = `${zoomLevel}%`;
    const zoomOut = status.querySelector('[data-action="zoom-out"]');
    const zoomIn = status.querySelector('[data-action="zoom-in"]');
    if (zoomOut) zoomOut.disabled = zoomLevel <= MIN_ZOOM;
    if (zoomIn) zoomIn.disabled = zoomLevel >= MAX_ZOOM;
  }

  function applyZoom() {
    if (enabled && zoomLevel !== 100) {
      document.documentElement.style.setProperty("zoom", `${zoomLevel / 100}`);
    } else {
      document.documentElement.style.removeProperty("zoom");
    }
    updateControls();
  }

  function setZoom(nextValue, persist) {
    zoomLevel = normalizeZoom(nextValue);
    applyZoom();
    if (enabled) showStatus(`ZOOM · ${zoomLevel}%`);
    if (persist !== false && api?.storage?.local) {
      api.storage.local.set({ [ZOOM_STORAGE_KEY]: zoomLevel });
    }
  }

  function setEnabled(nextValue, persist) {
    enabled = Boolean(nextValue);
    ensureStyle();
    document.documentElement.classList.toggle("eink-reader-mode", enabled);
    applyZoom();

    if (enabled) {
      ensureStatus();
      showStatus("PAGE MODE · ON");
    } else {
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
      return Promise.resolve({ enabled, zoomLevel });
    }
    if (message.type === "eink-reader:set-zoom") {
      setZoom(message.zoomLevel);
      return Promise.resolve({ enabled, zoomLevel });
    }
    if (message.type !== "eink-reader:set-enabled") return;
    setEnabled(message.enabled);
    return Promise.resolve({ enabled, zoomLevel });
  }

  ensureStyle();
  document.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
  document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
  document.addEventListener("keydown", handleKeydown, { capture: true });
  api?.runtime?.onMessage?.addListener(onRuntimeMessage);

  if (api?.storage?.local) {
    api.storage.local.get([STORAGE_KEY, ZOOM_STORAGE_KEY]).then(function (result) {
      if (result && result[ZOOM_STORAGE_KEY] !== undefined) {
        zoomLevel = normalizeZoom(result[ZOOM_STORAGE_KEY]);
      }
      if (result && result[STORAGE_KEY]) setEnabled(true, false);
    }).catch(function () {
      // Private browsing can disable extension storage; swipe activation still works.
    });
  }
})();