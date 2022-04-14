import { LoginState } from "../src/login_state";
import { User } from "../src/models/user";
import { Password } from "../src/models/password";

describe("LoginState", function () {
  it("should copy", function () {
    let loginState: LoginState = createLoginState();
    let clone = loginState.copyWith(
      new User("hello, i noticed", "couple bugs"),
      new Password("so")
    );
    expect(loginState === clone).toBe(false);
  });

  it("should copy without loss", () => {
    let loginState: LoginState = createLoginState();
    let clone = loginState.copyWith(new User("i decided", "to fix them"));
    expect(
      clone.password === loginState.password && loginState.user !== clone.user
    ).toBe(true);
  });

  function createLoginState(): LoginState {
    return new LoginState(
      new User("and btw", "blac is awesome"),
      new Password("you did a great job ;)")
    );
  }
});
