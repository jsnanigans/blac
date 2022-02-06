import { shallow } from "enzyme";
import React from "react";
import Auth from "./Auth";
import state from "../state";
import AuthBloc, { AuthEvent } from "../bloc/AuthBloc";
import CounterCubit from "../bloc/CounterCubit";
describe("Auth", function () {
    state.mocksEnabled = true;
    it("should have mocked state", function () {
        var auth = new AuthBloc();
        auth.add(AuthEvent.authenticated);
        state.addBlocMock(auth);
        var component = shallow(React.createElement(Auth, null));
        expect(component.text()).toContain('State: true');
        state.resetMocks();
    });
    it("should not mock state if `mockEnabled` is false", function () {
        state.mocksEnabled = false;
        var auth = new AuthBloc();
        auth.add(AuthEvent.authenticated);
        state.addBlocMock(auth);
        var component = shallow(React.createElement(Auth, null));
        expect(component.text()).toContain('State: false');
        state.resetMocks();
        state.mocksEnabled = true;
    });
    it("should select correct mock state", function () {
        state.addBlocMock(new CounterCubit());
        var auth = new AuthBloc();
        auth.add(AuthEvent.authenticated);
        state.addBlocMock(auth);
        var component = shallow(React.createElement(Auth, null));
        expect(component.text()).toContain('State: true');
        state.resetMocks();
    });
    it("should not have mocked state", function () {
        var component = shallow(React.createElement(Auth, null));
        expect(component.text()).toContain('State: false');
    });
});
