import { BlacEvent } from "blac/src";


// listen for events from chrome runtime and send them on to document
chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(message) {
    // Handle responses from the background page, if any
    console.log("devtools message -> doc", message);
    document.dispatchEvent(
      new CustomEvent("blac-event-request", {
        detail: message
      })
    );
  });
});


//inject
function injectScript(file: string, node: string) {
  const th = document.getElementsByTagName(node)[0];
  const s = document.createElement("script");
  s.setAttribute("type", "text/javascript");
  s.setAttribute("src", file);
  th.appendChild(s);
}

injectScript(chrome.runtime.getURL("dist/tools/inject_script.js"), "body");


// listen for events from document and send them on to chrome runtime
document.addEventListener("blac-event", function(rawEvent) {
  const e = rawEvent as CustomEvent<{
    event: BlacEvent;
    bloc: any;
  }>;

  void chrome.runtime.sendMessage({ event: e.detail }).catch((err) => {
    console.log("devtools message error", err);
  });
}, false);
