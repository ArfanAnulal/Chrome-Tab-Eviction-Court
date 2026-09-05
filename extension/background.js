// Tab metadata cache to beat the Chrome onRemoved race condition
const tabCache = {};

// 1. Continuously cache tab title & URL while active
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && !tab.url.includes("courtroom.html")) {
    tabCache[tabId] = {
      url: tab.url,
      title: tab.title || tab.url
    };
  }
});

// 2. Clean up cache when tab is replaced (e.g. prerendering)
chrome.tabs.onReplaced?.addListener((addedTabId, removedTabId) => {
  delete tabCache[removedTabId];
});

// 3. Intercept tab close
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const closedTab = tabCache[tabId];
  if (!closedTab) return;

  // Clean memory
  delete tabCache[tabId];

  // CRITICAL LOOP BREAKER: Never summon court for closing the courtroom or internal pages
  if (
    closedTab.url.includes("courtroom.html") || 
    closedTab.url.startsWith("chrome://") ||
    closedTab.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  // Launch Dev 2's Courtroom Tab passing metadata via URL parameters
  const courtUrl = chrome.runtime.getURL(
    `courtroom.html?url=${encodeURIComponent(closedTab.url)}&title=${encodeURIComponent(closedTab.title)}`
  );

  chrome.tabs.create({ url: courtUrl });
});

// 4. Listen for verdict actions sent from courtroom.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "REVIVE_TAB" && message.url) {
    // Punish the user: revive the closed page as a pinned tab
    chrome.tabs.create({ url: message.url, pinned: true });
    sendResponse({ status: "tab_resurrected" });
  }
});