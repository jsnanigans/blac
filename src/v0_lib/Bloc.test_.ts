import Bloc from "./Bloc";
import mockConsole from "jest-mock-console";
import { AuthEvent, TestBloc } from "../helpers/test.fixtures";

describe("Bloc", () => {
  const spy = {
    onChange: jest.fn(),
    onTransition: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should add the public `add` method", () => {
    expect(new TestBloc()).toHaveProperty("add");
  });

  describe("add", () => {
    it("should log error if `mapEventToState` is not implemented", () => {
      mockConsole();

      class NotFullyImplemented extends Bloc<AuthEvent, boolean> {}

      const bloc = new NotFullyImplemented(false);
      expect(bloc.state).toBe(false);
      bloc.add(AuthEvent.authenticated);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it("should update the state", () => {
      const bloc = new TestBloc();
      expect(bloc.state).toBe(false);
      bloc.add(AuthEvent.authenticated);
      expect(bloc.state).toBe(true);
    });

    it("should call `onChange` before the state changes", () => {
      const bloc = new TestBloc();
      bloc.addChangeListener(spy.onChange);
      expect(spy.onChange).toHaveBeenCalledTimes(0);
      bloc.add(AuthEvent.authenticated);
      expect(spy.onChange).toHaveBeenCalledTimes(1);
      expect(spy.onChange.mock.calls[0][0]).toStrictEqual({
        currentState: false,
        nextState: true,
      });
    });

    it("should call `onTransition` before the state changes with the event that was added", () => {
      const bloc = new TestBloc();
      bloc.onTransition = spy.onTransition;
      expect(spy.onTransition).toHaveBeenCalledTimes(0);
      bloc.add(AuthEvent.authenticated);
      expect(spy.onTransition).toHaveBeenCalledTimes(1);
      expect(spy.onTransition).toHaveBeenCalledWith({
        currentState: false,
        event: AuthEvent.authenticated,
        nextState: true,
      });
    });
  });
});
