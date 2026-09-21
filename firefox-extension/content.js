(function () {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const STORAGE_KEY = "einkReaderEnabled";
  const SWIPE_THRESHOLD = 48;
  const PAGE_OVERLAP = 72;
  const STATUS_ID = "eink-reader-status";
  const STYLE_ID = "eink-reader-styles";
  const READER_ROOT_ID = "eink-reader-document";

  let enabled = false;
  let touchStart = null;
  let wheelAccumulator = 0;
  let statusTimer = null;
  let readerRoot = null;

  const readerCss = `
    html.eink-reader-mode,
    html.eink-reader-mode body {
      background: #ffffff !important;
      color: #000000 !important;
    }

    html.eink-reader-mode body {
      margin: 0 !important;
    }

    html.eink-reader-mode body > :not(#${READER_ROOT_ID}) {
      display: none !important;
    }

    html.eink-reader-mode body > #${READER_ROOT_ID} {
      display: block !important;
    }

    #${READER_ROOT_ID} {
      box-sizing: border-box !important;
      min-height: 100vh !important;
      padding: clamp(24px, 7vw, 72px) clamp(18px, 6vw, 64px) 96px !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Georgia, "Times New Roman", serif !important;
      font-size: clamp(18px, 2.2vw, 22px) !important;
      line-height: 1.65 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    #${READER_ROOT_ID} .eink-reader-article {
      box-sizing: border-box !important;
      max-width: 44rem !important;
      margin: 0 auto !important;
    }

    #${READER_ROOT_ID} .eink-reader-title {
      margin: 0 0 0.85em !important;
      color: #000000 !important;
      font: 700 clamp(30px, 5vw, 48px)/1.08 Georgia, "Times New Roman", serif !important;
      letter-spacing: -0.02em !important;
    }

    #${READER_ROOT_ID} .eink-reader-byline {
      margin: -0.45em 0 2em !important;
      color: #000000 !important;
      font: 16px/1.4 Georgia, "Times New Roman", serif !important;
    }

    #${READER_ROOT_ID} p,
    #${READER_ROOT_ID} ul,
    #${READER_ROOT_ID} ol,
    #${READER_ROOT_ID} blockquote,
    #${READER_ROOT_ID} pre,
    #${READER_ROOT_ID} figure {
      margin: 0 0 1.15em !important;
    }

    #${READER_ROOT_ID} h1,
    #${READER_ROOT_ID} h2,
    #${READER_ROOT_ID} h3,
    #${READER_ROOT_ID} h4,
    #${READER_ROOT_ID} h5,
    #${READER_ROOT_ID} h6 {
      color: #000000 !important;
      font-family: Georgia, "Times New Roman", serif !important;
      line-height: 1.2 !important;
    }

    #${READER_ROOT_ID} a,
    #${READER_ROOT_ID} a * {
      color: #000000 !important;
      text-decoration-line: underline !important;
      text-decoration-thickness: 0.75px !important;
      text-underline-offset: 0.08em !important;
    }

    #${READER_ROOT_ID} img,
    #${READER_ROOT_ID} video,
    #${READER_ROOT_ID} canvas,
    #${READER_ROOT_ID} svg {
      max-width: 100% !important;
      height: auto !important;
      filter: grayscale(100%) contrast(1.12) !important;
    }

    #${READER_ROOT_ID} pre,
    #${READER_ROOT_ID} code {
      white-space: pre-wrap !important;
      overflow-wrap: anywhere !important;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
      font-size: 0.78em !important;
    }

    #${READER_ROOT_ID} blockquote {
      border-left: 3px solid #000000 !important;
      padding-left: 1em !important;
    }

    #${READER_ROOT_ID} input,
    #${READER_ROOT_ID} textarea,
    #${READER_ROOT_ID} select,
    #${READER_ROOT_ID} button {
      box-sizing: border-box !important;
      max-width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      border: 2px solid #000000 !important;
      border-radius: 0 !important;
      font: inherit !important;
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
      letter-spacing: 0.03em !important;
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
      letter-spacing: 0.03em !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-page-button {
      padding: 5px 7px !important;
      border: 1px solid #000000 !important;
      font: 700 10px/1 system-ui, sans-serif !important;
      letter-spacing: 0.04em !important;
      white-space: nowrap !important;
    }

    html.eink-reader-mode #${STATUS_ID} .eink-reader-page-button:hover {
      background: #000000 !important;
      color: #ffffff !important;
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
    style.textContent = readerCss;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeReaderView() {
    if (readerRoot) {
      readerRoot.remove();
      readerRoot = null;
    }
  }

  function createReaderView() {
    if (readerRoot) return true;
    if (typeof globalThis.Readability !== "function") {
      console.error("Inky: Mozilla Readability is not available.");
      return false;
    }

    const parsedArticle = new globalThis.Readability(document.cloneNode(true), {
      keepClasses: false
    }).parse();

    if (!parsedArticle || !parsedArticle.content) {
      console.warn("Inky: Mozilla Readability could not find an article on this page.");
      return false;
    }

    const root = document.createElement("main");
    root.id = READER_ROOT_ID;
    root.setAttribute("aria-label", "Inky reading view");

    const article = document.createElement("article");
    article.className = "eink-reader-article";

    if (parsedArticle.title) {
      const title = document.createElement("h1");
      title.className = "eink-reader-title";
      title.textContent = parsedArticle.title;
      article.appendChild(title);
    }

    if (parsedArticle.byline) {
      const byline = document.createElement("p");
      byline.className = "eink-reader-byline";
      byline.textContent = parsedArticle.byline;
      article.appendChild(byline);
    }

    const content = document.createElement("div");
    content.className = "eink-reader-content";
    content.innerHTML = parsedArticle.content;
    article.appendChild(content);
    root.appendChild(article);
    document.body.appendChild(root);
    readerRoot = root;
    return true;
  }

  function ensureStatus() {
    let status = document.getElementById(STATUS_ID);
    if (status) return status;

    status = document.createElement("div");
    status.id = STATUS_ID;
    status.innerHTML = `
      <button class="eink-reader-page-button" data-action="page-up" type="button" title="Page up" aria-label="Page up">← PAGE UP</button>
      <button class="eink-reader-status-button" type="button" title="Turn off e-ink reading mode">
        <span class="eink-reader-dot" aria-hidden="true"></span>
        <span data-role="label">PAGE MODE · ON</span>
      </button>
      <button class="eink-reader-page-button" data-action="page-down" type="button" title="Page down" aria-label="Page down">PAGE DOWN →</button>
    `;
    status.querySelector('[data-action="page-up"]').addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      goToPage(-1);
    });
    status.querySelector(".eink-reader-status-button").addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setEnabled(false);
    });
    status.querySelector('[data-action="page-down"]').addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      goToPage(1);
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
    const nextEnabled = Boolean(nextValue);

    if (nextEnabled && !enabled && !createReaderView()) {
      return false;
    }

    enabled = nextEnabled;
    ensureStyle();
    document.documentElement.classList.toggle("eink-reader-mode", enabled);

    if (enabled) {
      ensureStatus();
      showStatus("PAGE MODE · ON");
    } else {
      removeReaderView();
      removeStatus();
      clearTimeout(statusTimer);
      window.scrollTo(0, 0);
    }

    if (persist !== false && api?.storage?.local) {
      api.storage.local.set({ [STORAGE_KEY]: enabled });
    }
    return enabled;
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
    if (!touchStart || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const horizontalIntent = Math.abs(deltaX) > 16 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    const verticalIntent = Math.abs(deltaY) > 16 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15;

    if (horizontalIntent || (enabled && verticalIntent)) {
      event.preventDefault();
    }
  }

  function handleTouchEnd(event) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const isHorizontal = Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    touchStart = null;

    if (!isHorizontal) return;

    if (!enabled) {
      event.preventDefault();
      setEnabled(true);
      return;
    }

    event.preventDefault();
    goToPage(deltaX < 0 ? 1 : -1);
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
    if (message.type === "eink-reader:page-turn") {
      if (enabled) goToPage(Number(message.direction) < 0 ? -1 : 1);
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