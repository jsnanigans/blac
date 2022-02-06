import * as index from "./index";
describe("Index", function () {
    it("should export BlocReact", function () {
        expect(index).toHaveProperty("BlocReact");
    });
    it("should export Cubit", function () {
        expect(index).toHaveProperty("Cubit");
    });
    it("should export Bloc", function () {
        expect(index).toHaveProperty("Bloc");
    });
});
