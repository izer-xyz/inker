(function () {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const toggle = document.getElementById("toggle");
  const toggleText = document.getElementById("toggle-text");
  const stateLabel = document.getElementById("state-label");
  const zoomLabel = document.getElementById("zoom-label");
  const zoomOut = document.getElementById("zoom-out");
  const zoomIn = document.getElementById("zoom-in");
  const error = document.getElementById("error");
  let activeTabId = null;
  let enabled = false;
  let zoomLevel = 100;

  function render() {
    toggle.setAttribute("aria-pressed", String(enabled));
    toggleText.textContent = enabled ? "Turn off" : "Turn on";
    stateLabel.textContent = enabled ? "Page mode is on" : "Standard scrolling";
    zoomLabel.textContent = `${zoomLevel}%`;
    zoomOut.disabled = !enabled || zoomLevel <= 75;
    zoomIn.disabled = !enabled || zoomLevel >= 150;
  }

  async function getActiveTab() {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function getPageState(tabId) {
    try {
      return await api.tabs.sendMessage(tabId, {
        type: "eink-reader:get-state"
      });
    } catch (messageError) {
      await api.tabs.executeScript(tabId, { files: ["content.js"] });
      return api.tabs.sendMessage(tabId, {
        type: "eink-reader:get-state"
      });
    }
  }

  async function sendState(nextValue) {
    try {
      const response = await getPageState(activeTabId);
      await api.tabs.sendMessage(activeTabId, {
        type: "eink-reader:set-enabled",
        enabled: nextValue
      });
      enabled = nextValue;
      zoomLevel = Number(response && response.zoomLevel) || zoomLevel;
      render();
    } catch (messageError) {
      error.hidden = false;
      stateLabel.textContent = "Unavailable on this page";
    }
  }

  async function init() {
    try {
      const tab = await getActiveTab();
      activeTabId = tab && tab.id;
      if (!activeTabId) throw new Error("No active tab");

      const response = await getPageState(activeTabId);
      enabled = Boolean(response && response.enabled);
      zoomLevel = Number(response && response.zoomLevel) || 100;
      render();
    } catch (messageError) {
      error.hidden = false;
      stateLabel.textContent = "Swipe to activate";
    }
  }

  toggle.addEventListener("click", function () {
    if (activeTabId) sendState(!enabled);
  });

  async function changeZoom(delta) {
    if (!activeTabId || !enabled) return;
    const nextZoom = Math.max(75, Math.min(150, zoomLevel + delta));
    if (nextZoom === zoomLevel) return;
    try {
      const response = await api.tabs.sendMessage(activeTabId, {
        type: "eink-reader:set-zoom",
        zoomLevel: nextZoom
      });
      zoomLevel = Number(response && response.zoomLevel) || nextZoom;
      render();
    } catch (messageError) {
      error.hidden = false;
    }
  }

  zoomOut.addEventListener("click", function () {
    changeZoom(-10);
  });

  zoomIn.addEventListener("click", function () {
    changeZoom(10);
  });

  init();
})();