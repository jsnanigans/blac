import { User } from "./models/user";
import { Password } from "./models/password";

export class LoginState {
  constructor(public user: User, public password: Password) {}

  copyWith = (user?: User, password?: Password): LoginState => {
    return new LoginState(
      user ? user : this.user,
      password ? password : this.password
    );
  };
}
