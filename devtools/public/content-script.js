"use strict";
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
function saveSelectedElement(el) {
  logger.log("content: saveSelectedElement", el);
  selectedElement = el;
  var result = {
    localName: '',
    className: '',
    id: '',
    name: 'default',
    value: 'default'
  };
  if (el) {
    //logger.log(`content: saveSelectedElement: if (el) true`)
    if (el.localName) {
      result.localName = el.localName;
    }
    if (el.className) {
      //result.classSelector = `${ test.localName }.${ el.className.replace(/\s{2,}/, ' ').replace(/\s/, '.') }`
      result.className = el.className.trim();
    }
    //logger.log('result after if (el.className)', result)
    if (el.id) {
      result.id = el.id;
    }
    //logger.log('result after if (el.id)', result)
    var attributes = el.attributes;
    if (attributes && attributes.id) {
      result.name = attributes.id.name;
      result.value = attributes.id.value;
    }
  }
  var deserialized = JSON.stringify(result);
  return deserialized;
}

logger.log('ASDSAD');
top.window.__BLOC_REACT_DEVTOOLS_OBSERVER__ = 20;

function defineObserver(obs) {
  logger.log("DEFINE")
  top.window.__BLOC_REACT_DEVTOOLS_OBSERVER__ = obs;
  return 2
}