chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "truthlens",
    title: "Check with TruthLens",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(
  async (info, tab) => {
    if (info.menuItemId === "truthlens" && info.selectionText) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
      } catch (e) {
        console.log("Script already injected");
      }
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: "checkText",
          text: info.selectionText
        });
      } catch (e) {
        console.error("Message error:", e);
      }
    }
  }
);