import { User } from "./models/user";
import { Password } from "./models/password";

export abstract class LoginEvent{
}

export class LoginUserChanged extends LoginEvent{
  constructor(
    public user: User
  ) {
    super();
  }
}

export class LoginPasswordChanged extends LoginEvent{
  constructor(
    public password : Password
  ) {
    super();
  }
}

