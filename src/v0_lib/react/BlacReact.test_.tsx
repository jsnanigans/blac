import { BlacReact } from "./BlacReact";
import Cubit from "../Cubit";
import mockConsole from "jest-mock-console";
import React, { FC } from "react";
import { mount, shallow } from "enzyme";
import { render } from "@testing-library/react";
import { useBloc, withBlocProvider } from "../../react/state";
import { BlocHookData } from "../types";

const HookComp: FC<{ hook: () => BlocHookData<any>; set: { hook: any[] } }> = ({
  hook,
  set,
}) => {
  const x = hook();
  set.hook = x;
  return <div></div>;
};
const shallowHook = (hook: () => BlocHookData<any>) => {
  const res: { update: () => void; result: any[] } = {
    update: () => {},
    result: [],
  };

  const obj = {
    hook: [],
  };

  shallow(<HookComp hook={hook} set={obj} />);
  res.result = obj.hook;

  const updateResult = () => {
    shallow(<HookComp hook={hook} set={obj} />);
    res.result = obj.hook;
  };

  res.update = updateResult;
  return res;
};

class Test1 extends Cubit<number> {
  constructor(options: { register?: () => void } = {}) {
    super(1);

    if (options.register) {
      this.addRegisterListener(options.register);
    }
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  reset = () => {
    this.emit(1);
  };
}

class Test2 extends Cubit<number> {}

class Test3 extends Test1 {}

const t1 = new Test1();
const testState = new BlacReact([t1]);
const { BlocProvider, BlocBuilder } = testState;

describe("Blac", function () {
  afterEach(() => {
    jest.resetAllMocks();
    t1.reset();
  });

  describe("useBloc", function () {
    it("should be defined", function () {
      expect(testState).toHaveProperty("useBloc");
    });

    it("should get data and handle state change", function () {
      const hook = shallowHook(() => testState.useBloc(Test1));
      expect(hook.result[0]).toBe(1);
      expect(hook.result[1] instanceof Test1).toBe(true);

      hook.result[1].increment();
      hook.update();

      expect(hook.result[0]).toBe(2);
    });

    it("should create new instance of the state for its own scope", function () {
      const customInstance = new Test3();
      const hook = shallowHook(() =>
        testState.useBloc(Test3, {
          create: () => customInstance,
        })
      );
      expect(hook.result[0]).toBe(1);
      expect(hook.result[1] instanceof Test3).toBe(true);

      hook.result[1].increment();
      hook.update();

      expect(hook.result[0]).toBe(2);
    });

    it("should log error if bloc is not in context", function () {
      mockConsole();
      const hook = shallowHook(() => testState.useBloc(Test2));
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(hook.result[1]).toStrictEqual({});
    });

    it("should get state from local provider", function () {
      const initialValue = 88;
      const Consumer = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return (
          <BlocProvider bloc={() => new Test2(initialValue)}>
            <Consumer />
          </BlocProvider>
        );
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });

    it("should get state from local provider, as value", function () {
      const initialValue = 88;
      const Consumer = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return (
          <BlocProvider bloc={new Test2(initialValue)}>
            <Consumer />
          </BlocProvider>
        );
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });

    it("should handle bloc not defined", function () {
      mockConsole();
      shallow(<BlocProvider bloc={undefined as any}></BlocProvider>);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("BLoC is undefined");
    });

    it("should not react to state change if option `shouldUpdate` is false", function () {
      const hook = shallowHook(() =>
        testState.useBloc(Test1, { subscribe: false })
      );
      expect(hook.result[0]).toBe(1);
      hook.result[1].increment();
      expect(hook.result[0]).toBe(1);
      expect(hook.result[1].state).toBe(2);
    });

    it("should call `shouldUpdate` and only update state if it returns true", function () {
      const hook = shallowHook(() =>
        testState.useBloc(Test1, {
          shouldUpdate: (event) => event.nextState % 2 === 0,
        })
      );
      expect(hook.result[0]).toBe(1);
      hook.result[1].increment();
      hook.update();
      expect(hook.result[0]).toBe(2);
      hook.result[1].increment();
      expect(hook.result[0]).toBe(2);
      expect(hook.result[1].state).toBe(3);
    });
  });

  describe("BlocBuilder", function () {
    it("should be defined", function () {
      expect(testState).toHaveProperty("BlocBuilder");
    });

    it("should get local state", function () {
      const initialValue = 88;
      const Provider = () => {
        return (
          <BlocProvider bloc={() => new Test2(initialValue)}>
            <BlocBuilder
              blocClass={Test2}
              builder={([state]) => <div>{state}</div>}
            />
          </BlocProvider>
        );
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });
  });

  describe("BlocProvider", function () {
    it("should be defined", function () {
      expect(testState).toHaveProperty("BlocProvider");
    });

    it("should should remove local bloc from list when unmounted", function (done) {
      const initialValue = 88;
      const remove = jest.fn();
      const bloc = new Test2(initialValue);
      bloc.addRemoveListener(remove);

      const Inner = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return (
          <BlocProvider bloc={bloc}>
            <Inner />
          </BlocProvider>
        );
      };

      const component = render(<Provider />);
      expect(remove).toHaveBeenCalledTimes(0);
      component.unmount();
      expect(remove).toHaveBeenCalledTimes(1);
      done();
    });

    it("should pass bloc as value, not function", function () {
      const initialValue = 88;
      const bloc = new Test2(initialValue);
      const Provider = () => {
        return (
          <BlocProvider bloc={bloc}>
            <BlocBuilder
              blocClass={Test2}
              builder={([state]) => <div>{state}</div>}
            />
          </BlocProvider>
        );
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });
  });

  describe("withBlocProvider", () => {
    const Child = () => <div>Child</div>;

    it("should setup state and work as expected", () => {
      const value = 382989239238;
      const Consumer = () => {
        const [count] = useBloc(Test2);
        return <div>Value: {count}</div>;
      };
      const Comp = withBlocProvider(new Test2(value))(Consumer);
      const component = mount(
        <div>
          <Comp />
        </div>
      );
      expect(component.text()).toContain("Value: " + value);
    });

    it("should render with child", () => {
      const Comp = withBlocProvider(new Test2(2))(Child);
      const component = shallow(<Comp />);
      expect(component.find(Child).exists()).toBe(true);
    });

    it("should render with render with special name", () => {
      const Comp = withBlocProvider(new Test2(2))(Child);
      const component = shallow(
        <div>
          <Comp />
        </div>
      );
      expect(component.find("WithBlocProvider").exists()).toBe(true);
    });
  });
});
