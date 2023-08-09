import "./react";
import "./base.css";

// DevTools page -- devtools.js
// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
  name: "devtools-page"
});

backgroundPageConnection.onMessage.addListener(function(message) {
  // Handle responses from the background page, if any
});

// Relay the tab ID to the background page
backgroundPageConnection.postMessage({
  tabId: chrome.devtools.inspectedWindow.tabId,
  scriptToInject: "dist/tools/content_script.js"
});

backgroundPageConnection.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("message", message);
});