import { shallow } from "enzyme";
import React from "react";
import Auth from "./Auth";
import state from "../state";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";

state.mocksEnabled = true;

describe("Auth", function() {
  it("should have mocked state", function() {
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