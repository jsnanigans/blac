import { shallow } from "enzyme";
import React from "react";
import Auth from "./Auth";
import state from "../state";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import CounterCubit from "../bloc/CounterCubit";


describe("Auth", function() {
  state.mocksEnabled = true;

  it("should have mocked state", function() {
    const auth = new AuthBloc();
    auth.add(AuthEvent.authenticated);
    state.addBlocMock(auth);

    const component = shallow(<Auth />);
    expect(component.text()).toContain('State: true');

    state.resetMocks();
  });

  it("should not mock state if `mockEnabled` is false", function() {
    state.mocksEnabled = false;
    const auth = new AuthBloc();
    auth.add(AuthEvent.authenticated);
    state.addBlocMock(auth);

    const component = shallow(<Auth />);
    expect(component.text()).toContain('State: false');

    state.resetMocks();
    state.mocksEnabled = true;
  });

  it("should select correct mock state", function() {
    state.addBlocMock(new CounterCubit());

    const auth = new AuthBloc();
    auth.add(AuthEvent.authenticated);
    state.addBlocMock(auth);

    const component = shallow(<Auth />);
    expect(component.text()).toContain('State: true');

    state.resetMocks();
  });

  it("should not have mocked state", function() {
    const component = shallow(<Auth />);
    expect(component.text()).toContain('State: false');
  });
});