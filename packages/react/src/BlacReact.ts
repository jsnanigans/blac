import { Blac } from "blac";
import React from "react";
import { BlacContext } from "./BlacApp";

export default class BlacReact {
  static pluginKey = "blacReact";
  blac: Blac<any>;
  blacContext: React.Context<Blac<any>>;

  constructor(blac: Blac<any>, blacContext: React.Context<Blac<any>>) {
    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    // new setup
    this.blac = blac;
    this.blacContext = blacContext;
    this.setup();

    if (blacReact) {
      return blacReact as BlacReact;
    }
  }

  static getInstance(throwError = true): BlacReact {
    // const blac = (globalThis as any).blac;
    const blac = (BlacContext as any)._currentValue as Blac<any> | null;

    if (!blac) {
      throw new Error("BlacReact: blac instance not found, the <BlacApp> provider component might be missing");
    }

    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    if (!blacReact) {
      throw new Error("BlacReact: blacReact instance not found");
    }

    return blacReact as BlacReact;
  }

  setup() {
    // (globalThis as any).blac = this.blac;
    this.blac.addPluginKey(BlacReact.pluginKey, this);
  }
}
