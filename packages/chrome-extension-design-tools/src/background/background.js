chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-inspector") {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return;
  }

  await sendMessage(tab.id, { type: "design-tools:toggle-active" });
});

async function sendMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_error) {
    return null;
  }
}
