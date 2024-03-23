import "./connect";
import "./react";
import "./base.css";

// DevTools page -- devtools.js
// Create a connection to the background page
const backgroundPageConnection = chrome.runtime.connect({
  name: "blac-devtools-page"
});

// backgroundPageConnection.onMessage.addListener(function(message) {
//   // Handle responses from the background page, if any
//   // console.log("devtools message", message);
// });
//
// Relay the tab ID to the background page
backgroundPageConnection.postMessage({
  tabId: chrome.devtools.inspectedWindow.tabId,
  scriptToInject: "dist/tools/inject_script.js"
});

