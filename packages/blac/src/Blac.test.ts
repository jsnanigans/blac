import { describe, expect, it } from "vitest";
import { Blac } from "./Blac";
import { CounterBloc } from "./examples/CounterBloc";


describe("Blac", () => {
  it("should register instance on globalThis.blac", () => {
    const globalBlacInstance = new Blac();
    expect((globalThis as any).blac).toBe(globalBlacInstance);
  });

  describe("registerBloc", () => {
    it("should register bloc", () => {
      const blac = new Blac();
      const counterBloc = new CounterBloc();
      blac.registerBloc(counterBloc);
      expect(blac.blocMap.get(CounterBloc)).toBe(counterBloc);
    });
  });

  describe("getBloc", () => {
    it("should return bloc", () => {
      const blac = new Blac();
      const counterBloc = new CounterBloc();
      blac.registerBloc(counterBloc);
      expect(blac.getBloc(CounterBloc)).toBe(counterBloc);
    });

    it("should initialise the bloc when not found", () => {
      const blac = new Blac();
      expect(blac.getBloc(CounterBloc)).not.toBeUndefined();
    });
  });

  describe("pluginKey", () => {
    it("should add pluginKey", () => {
      const blac = new Blac();
      blac.addPluginKey("test", "test");
      expect(blac.pluginMap.get("test")).toBe("test");
    });

    it("should return undefined if not found", () => {
      const blac = new Blac();
      expect(blac.pluginMap.get("test")).toBeUndefined();
    });
  });
});


