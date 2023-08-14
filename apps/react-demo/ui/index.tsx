// render app in #root

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Blac } from "blac/src";

Blac.configure({
  exposeBlacInstance: true
});

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);

// const rndmzElements = () => {
//   const selector = '*:not(code, code *)';
//   const elements = document.querySelectorAll(selector) as unknown as HTMLElement[];
//
//   elements.forEach((element) => {
//     const rndRot = Math.random() * 0.5 - 0.25;
//     const rndOffsetX = Math.random() * 0.2 - 0.1;
//     const rndOffsetY = Math.random() * 0.2 - 0.1;
//     element.style.setProperty('--r', `${rndRot}deg`);
//     element.style.setProperty('--x', `${rndOffsetX}rem`);
//     element.style.setProperty('--y', `${rndOffsetY}rem`);
//   });
// };

// window.addEventListener('hashchange', rndmzElements);
// window.addEventListener('load', rndmzElements);
