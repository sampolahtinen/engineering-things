const toggleButton = document.querySelector("#toggle");
const toggleLabel = toggleButton.querySelector(".toggle__label");
const statusElement = document.querySelector("#status");

let currentTabId = null;
let active = false;

initialize();

toggleButton.addEventListener("click", async () => {
  if (currentTabId === null) {
    return;
  }

  await setInspectorActive(!active);
});

async function initialize() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;

  if (currentTabId === null) {
    setUnavailable("No active tab found.");
    return;
  }

  const response = await sendMessage({ type: "design-tools:get-state" });

  if (!response) {
    setUnavailable("Open or reload a normal web page, then try again.");
    return;
  }

  setState(response.active);
  statusElement.textContent = response.active ? "Inspector is active on this tab." : "Inspector is ready on this tab.";
}

async function setInspectorActive(nextActive) {
  toggleButton.disabled = true;
  statusElement.textContent = nextActive ? "Enabling inspector..." : "Disabling inspector...";

  const response = await sendMessage({ type: "design-tools:set-active", active: nextActive });

  if (!response) {
    setUnavailable("This page does not allow inspection. Try a normal website tab.");
    return;
  }

  setState(response.active);
  toggleButton.disabled = false;
  statusElement.textContent = response.active ? "Inspector enabled. Hover an element on the page." : "Inspector disabled.";
}

async function sendMessage(message) {
  try {
    return await chrome.tabs.sendMessage(currentTabId, message);
  } catch (_error) {
    return null;
  }
}

function setState(nextActive) {
  active = Boolean(nextActive);
  toggleButton.disabled = false;
  toggleButton.setAttribute("aria-pressed", String(active));
  toggleLabel.textContent = active ? "Disable inspector" : "Enable inspector";
}

function setUnavailable(message) {
  active = false;
  toggleButton.disabled = true;
  toggleButton.setAttribute("aria-pressed", "false");
  toggleLabel.textContent = "Inspector unavailable";
  statusElement.textContent = message;
}
