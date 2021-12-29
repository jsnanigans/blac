// const Messenger = require('ext-messenger');
// let messenger = new Messenger();
//
// let messageHandler = function(msg, from, sender, sendResponse) {
//   sendResponse('HOWDY!');
// };
//
// let c = messenger.initConnection('main', messageHandler);
// c.sendMessage('devtool:*', { text: 'HI!' });

var logger = {
  log: function () {
    console.log(Array.prototype.slice.call(arguments))
  },
  error: function () {
    console.log(Array.prototype.slice.call(arguments));
  }
};
var selectedElement;
/**
 * Saves selected inspected element
 * The function invokes by devtools.js ("chrome.devtools.inspectedWindow.eval")
 * @param el {HTMLElement}
 */

window.__BLOC_REACT_DEVTOOLS_OBSERVER__ = 10;
function defineObserver(obs) {
  logger.log("DEFINE", obs)
  // top.window.__BLOC_REACT_DEVTOOLS_OBSERVER__ = obs;
  return 2
}


console.log('HE');