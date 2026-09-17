(function () {
  "use strict";

  const api = globalThis.browser || globalThis.chrome;
  const toggle = document.getElementById("toggle");
  const toggleText = document.getElementById("toggle-text");
  const stateLabel = document.getElementById("state-label");
  const error = document.getElementById("error");
  let activeTabId = null;
  let enabled = false;

  function render() {
    toggle.setAttribute("aria-pressed", String(enabled));
    toggleText.textContent = enabled ? "Turn off" : "Turn on";
    stateLabel.textContent = enabled ? "Page mode is on" : "Standard scrolling";
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
      await getPageState(activeTabId);
      await api.tabs.sendMessage(activeTabId, {
        type: "eink-reader:set-enabled",
        enabled: nextValue
      });
      enabled = nextValue;
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
      render();
    } catch (messageError) {
      error.hidden = false;
      stateLabel.textContent = "Swipe to activate";
    }
  }

  toggle.addEventListener("click", function () {
    if (activeTabId) sendState(!enabled);
  });

  init();
})();