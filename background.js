// background.js
// Currently no background tasks are needed — storage and content scripts
// handle everything directly. This file exists so the manifest's service
// worker reference resolves cleanly, and gives us a place to add badge
// counts or cross-tab sync later if we want them.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Cart Buddy installed.");
});
