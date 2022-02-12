import ReactDOM from "react-dom";
import DevTools from "./DevTools";
import React from "react";
import Observer from "./observer";
import { chromeDevToolsHelper, logger } from "./chrome";

ReactDOM.render(<DevTools />, document.getElementById("devtool"));

// @ts-ignore
window.Blac = new Observer();

///////////////////////////// chrome.devtools //////////////////////////
chromeDevToolsHelper.init({
  panelName: 'Your Panel Name',
  onShown: () => {
    // on panel shown, update the panel data through Vuex store
    logger.log('onShown')
    //store.dispatch ...
  },
  onHidden: () => {
    logger.log('onHidden')
    // store.commit('resetItems')
  },
  onModelUpdated: (value: any) => {
    logger.log(value)
    // if (value) {
    //   let parsed: IItem
    //   if (typeof value === 'string') {
    //     parsed = JSON.parse(value)
    //   } else {
    //     parsed = value
    //   }
    //   store.commit(MutationType.addItem, parsed)
    // } else {
    //   logger.log('WARNING: onModelUpdated: value is not defined')
    // }
  }
})
///////////////////////////// chrome.devtools //////////////////////////