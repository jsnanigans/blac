import { describe, expect, it } from "vitest";
import { Blac } from "./Blac";
import { CounterBloc } from "./examples/CounterBloc";

export const globalBlacInstance = new Blac();

describe('Blac', () => {
  it('should be registered in blac', () => {
    const counter = new CounterBloc({ blac: globalBlacInstance });
    expect(globalBlacInstance.blocMap).toContain(counter);
  });
});


