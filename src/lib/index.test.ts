import * as index from "./index";

describe("Index", () => {
  it("should export Blac", () => {
    expect(index).toHaveProperty("BlacReact");
  });
  it("should export Cubit", () => {
    expect(index).toHaveProperty("Cubit");
  });
  it("should export Bloc", () => {
    expect(index).toHaveProperty("Bloc");
  });
});
