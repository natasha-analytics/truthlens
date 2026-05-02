chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "truthlens",
    title: "Check with TruthLens",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "truthlens" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "checkText",
      text: info.selectionText || "",
    });
  }
});
