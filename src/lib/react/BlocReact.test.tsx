import { act, renderHook } from "@testing-library/react-hooks";
import { BlocReact } from "./BlocReact";
import Cubit from "../Cubit";
import mockConsole from "jest-mock-console";
import React from "react";
import { render } from "@testing-library/react";
import { mount } from "enzyme";

const removeLocalBlocMock = jest.fn();

class BlocReactExposed extends BlocReact {
  public removeLocalBloc(key: string) {
    removeLocalBlocMock(key);
    super.removeLocalBloc(key);
  }
}

class Test1 extends Cubit<number> {
  constructor(options: { register?: () => void } = {}) {
    super(1);

    if (options.register) {
      this.onRegister = options.register;
    }
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  reset = () => {
    this.emit(1);
  };
}

class Test2 extends Cubit<number> {
}

const t1 = new Test1();
const testState = new BlocReactExposed([t1]);
const { BlocProvider, BlocBuilder } = testState;

describe("BlocReact", function() {

  afterEach(() => {
    jest.resetAllMocks();
    act(() => {
      t1.reset();
    });
  });

  describe("useBloc", function() {
    it("should be defined", function() {
      expect(testState).toHaveProperty("useBloc");
    });

    it("should get data and handle state change", function() {
      const { result } = renderHook(() => testState.useBloc(Test1));
      const [, instance] = result.current;
      expect(result.current[0]).toBe(1);
      expect(result.current[1] instanceof Test1).toBe(true);
      act(() => {
        instance.increment();
      });
      expect(result.current[0]).toBe(2);
    });

    it("should log error if bloc is not in context", function() {
      mockConsole();
      const { result } = renderHook(() => testState.useBloc(Test2));
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(result.current[1]).toStrictEqual({});
    });

    it("should get state from local provider", function() {
      const initialValue = 88;
      const Consumer = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return <BlocProvider
          create={() => new Test2(initialValue)}
        >
          <Consumer />
        </BlocProvider>;
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });

    it("should not react to state change if option `shouldUpdate` is false", function() {
      const { result } = renderHook(() => testState.useBloc(Test1, { subscribe: false }));
      const [, instance] = result.current;
      expect(result.current[0]).toBe(1);
      act(() => {
        instance.increment();
      });
      expect(result.current[0]).toBe(1);
      expect(instance.state).toBe(2);
    });

    it("should call `shouldUpdate` and only update state if it returns true", function() {
      const { result } = renderHook(() => testState.useBloc(Test1, {
        shouldUpdate: (event) => event.nextState % 2 === 0
      }));
      const [, instance] = result.current;
      expect(result.current[0]).toBe(1);
      act(() => {
        instance.increment();
      });
      expect(result.current[0]).toBe(2);
      act(() => {
        instance.increment();
      });
      expect(result.current[0]).toBe(2);
      expect(instance.state).toBe(3);
    });
  });

  describe("BlocBuilder", function() {
    it("should be defined", function() {
      expect(testState).toHaveProperty("BlocBuilder");
    });

    it("should get local state", function() {
      const initialValue = 88;
      const Provider = () => {
        return <BlocProvider
          create={() => new Test2(initialValue)}
        >
          <BlocBuilder
            blocClass={Test2}
            builder={([state]) => <div>{state}</div>}
          />
        </BlocProvider>;
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });
  });

  describe("BlocProvider", function() {
    it("should be defined", function() {
      expect(testState).toHaveProperty("BlocProvider");
    });

    it("should should remove local bloc from list when unmounted", function(done) {
      const initialValue = 88;

      const Consumer = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return <BlocProvider
          create={() => new Test2(initialValue)}
        >
          <Consumer />
        </BlocProvider>;
      };

      const component = render(<Provider />);
      expect(removeLocalBlocMock).toHaveBeenCalledTimes(0);
      component.unmount();
      expect(removeLocalBlocMock).toHaveBeenCalledTimes(1);
      done();
    });
  });
});