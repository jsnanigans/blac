import Bloc from "../../../Bloc";
import { LoginEvent, LoginUserChanged } from "./login_events";
import { LoginState } from "./login_state";
import { User } from "./models/user";
import { Password } from "./models/password";

export default class LoginBloc extends Bloc<LoginEvent, LoginState>{

  constructor() {
    var initialState = new LoginState(new User("j","a"), new Password("j"))
    super(initialState);
    this.on(LoginUserChanged, this._onLoginUserChanged )
  }

  _onLoginUserChanged(event : LoginEvent, emit : any, state : any){
    let userEvent = event as LoginUserChanged;
    var clone = {...state};
    clone.user = userEvent.user;
    emit(clone);
  }
}