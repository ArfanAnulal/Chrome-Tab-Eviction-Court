// Tab metadata cache to beat the Chrome onRemoved race condition
const tabCache = {};

// Whitelist configuration to safeguard vital developer, system, and authentication tabs
const WHITELIST_PROTOCOLS = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "brave://",
  "opera://",
  "devtools://",
  "about:",
  "view-source:",
  "blob:",
  "data:"
];

const WHITELIST_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "accounts.google.com",
  "login.microsoftonline.com",
  "appleid.apple.com",
  "auth0.com"
];

const WHITELIST_PATTERNS = [
  /courtroom\.html/i,
  /^https?:\/\/github\.com\/login/i,
  /^https?:\/\/([^/]+\.)?auth0\.com/i,
  /^https?:\/\/id\.atlassian\.com/i
];

/**
 * Fast evaluation helper to check if a URL belongs to the whitelist.
 * @param {string} rawUrl 
 * @returns {boolean}
 */
function isWhitelisted(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return true;

  const urlStr = rawUrl.trim();
  if (!urlStr || urlStr === "about:blank") return true;

  // 1. Check protocol prefixes
  for (const proto of WHITELIST_PROTOCOLS) {
    if (urlStr.startsWith(proto)) return true;
  }

  // 2. Check regex patterns (courtroom page, specific login endpoints)
  for (const pattern of WHITELIST_PATTERNS) {
    if (pattern.test(urlStr)) return true;
  }

  // 3. Check domain hostnames
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    for (const whitelistedHost of WHITELIST_HOSTS) {
      if (hostname === whitelistedHost || hostname.endsWith("." + whitelistedHost)) {
        return true;
      }
    }
  } catch {
    // If URL parsing fails, fallback to simple substring safeguard
    if (urlStr.includes("courtroom.html") || urlStr.includes("localhost") || urlStr.includes("127.0.0.1")) {
      return true;
    }
  }

  return false;
}

// 1. Continuously cache tab title & URL while active, skipping whitelisted tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || isWhitelisted(tab.url)) {
    delete tabCache[tabId];
    return;
  }
  tabCache[tabId] = {
    url: tab.url,
    title: tab.title || tab.url
  };
});

// 2. Clean up cache when tab is replaced (e.g. prerendering)
chrome.tabs.onReplaced?.addListener((addedTabId, removedTabId) => {
  delete tabCache[removedTabId];
});

// 3. Intercept tab close with whitelist protection
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const closedTab = tabCache[tabId];
  delete tabCache[tabId];

  if (!closedTab || !closedTab.url) return;

  // Loop guard & whitelist check: skip eviction if whitelisted
  if (isWhitelisted(closedTab.url)) {
    return;
  }

  // Launch Courtroom Tab passing metadata via URL parameters
  const courtUrl = chrome.runtime.getURL(
    `courtroom.html?url=${encodeURIComponent(closedTab.url)}&title=${encodeURIComponent(closedTab.title || closedTab.url)}`
  );

  chrome.tabs.create({ url: courtUrl }, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn("[Tab Courtroom] Failed to open courtroom tab:", chrome.runtime.lastError.message);
    }
  });
});

// 4. Listen for verdict actions sent from courtroom.html with robust error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "REVIVE_TAB" && message.url) {
    try {
      // Punish the user: revive the closed page as a pinned tab
      chrome.tabs.create({ url: message.url, pinned: true }, (newTab) => {
        if (chrome.runtime.lastError) {
          console.warn("[Tab Courtroom] Tab revival failed:", chrome.runtime.lastError.message);
          sendResponse({ status: "error", error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ status: "tab_resurrected", tabId: newTab ? newTab.id : null });
        }
      });
    } catch (err) {
      console.warn("[Tab Courtroom] Unexpected error during tab revival:", err);
      sendResponse({ status: "error", error: err.message });
    }
    return true; // Keep sendResponse channel open for async response
  }
});