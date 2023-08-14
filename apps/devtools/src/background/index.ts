// console.log("background.js");
//
// chrome.runtime.onConnect.addListener(function(port) {
//   port.onMessage.addListener(function(msg) {
//     console.log("bg msg", msg);
//
//     if (msg.joke === "CI Knock knock")
//       port.postMessage({ question: "BG Who's there?" });
//     else if (msg.answer === "CI Madame")
//       port.postMessage({ question: "BG Madame who?" });
//     else if (msg.answer === "CI Madame... Bovary")
//       port.postMessage({ question: "BG I don't get it." });
//   });
// });
//
//
