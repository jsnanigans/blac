import * as index from "./index";

describe("Index", () => {
  it("should export BlocReact", () => {
    expect(index).toHaveProperty("BlocReact");
  });
  it("should export Cubit", () => {
    expect(index).toHaveProperty("Cubit");
  });
  it("should export Bloc", () => {
    expect(index).toHaveProperty("Bloc");
  });
});
