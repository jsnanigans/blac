console.log("from script inject", window.location.href);
console.log("content_script.js");

var port = chrome.runtime.connect({ name: "knockknock" });
port.postMessage({ joke: "Knock knock" });
port.onMessage.addListener(function(msg) {
  console.log("c msg", msg);
  if (msg.question === "Who's there?")
    port.postMessage({ answer: "Madame" });
  else if (msg.question === "Madame who?")
    port.postMessage({ answer: "Madame... Bovary" });
});