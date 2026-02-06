// Background service worker for Network Enhance
// Required for Manifest V3

chrome.runtime.onInstalled.addListener(() => {
  console.log("Network Enhance extension installed");
});
