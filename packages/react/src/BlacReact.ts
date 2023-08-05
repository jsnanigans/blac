import { Blac } from "blac";

export default class BlacReact {
  static pluginKey = "blacReact";
  // blacContext: React.Context<Blac>;
  static instance: BlacReact | undefined;
  blac: Blac = new Blac();

  constructor() {
    // singleton
    if (BlacReact.instance) {
      return BlacReact.instance;
    }

    BlacReact.instance = this;
    this.registerPlugin();
  }

  static getInstance() {
    if (!BlacReact.instance) {
      return new BlacReact();
    }
    return BlacReact.instance;
  }

  static getPluginInstance(blac?: Blac): BlacReact {
    if (!blac) {
      throw new Error("BlacReact: blac instance not found, the <BlacApp> provider component might be missing");
    }

    const blacReact = blac.getPluginKey(BlacReact.pluginKey);

    if (!blacReact) {
      throw new Error("BlacReact: blacReact instance not found");
    }

    return blacReact as BlacReact;
  }

  registerPlugin() {
    this.blac?.addPluginKey(BlacReact.pluginKey, this);
  }
}
