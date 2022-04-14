
import LoginBloc from '../src/login_bloc'
import { User } from "../src/models/user";
import { LoginUserChanged } from "../src/login_events";


describe("Login Bloc", () => {
  it("should change with user change", function() {
    let loginBloc = new LoginBloc();
    let oldUser = loginBloc.state.user;
    loginBloc.add(new LoginUserChanged(new User("john", "doe")))
    let newUser = loginBloc.state.user;
    expect(oldUser !== newUser).toBe(true)
  });
});