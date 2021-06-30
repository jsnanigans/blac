import { act, renderHook } from "@testing-library/react-hooks";
import { BlocReact } from "./BlocReact";
import Cubit from "../Cubit";
import mockConsole from "jest-mock-console";
import React from "react";
import { mount, shallow } from "enzyme";
import { render } from "@testing-library/react";
import { withBlocProvider } from "../../react/state";

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


class Test2 extends Cubit<number> {
}

class Test3 extends Test1 {
}

const t1 = new Test1();
const testState = new BlocReact([t1]);
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

    it("should create new instance of the state for its own scope", function() {
      const { result } = renderHook(() => testState.useBloc(Test3, {
        create: () => new Test3()
      }));
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
          bloc={() => new Test2(initialValue)}
        >
          <Consumer />
        </BlocProvider>;
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });

    it("should get state from local provider, as value", function() {
      const initialValue = 88;
      const Consumer = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return <BlocProvider
          bloc={new Test2(initialValue)}
        >
          <Consumer />
        </BlocProvider>;
      };

      const component = mount(<Provider />);
      expect(component.text()).toBe(`${initialValue}`);
    });

    it("should handle bloc not defined", function() {
      mockConsole();
      const Provider = () => {
        return <BlocProvider
          bloc={undefined as any}
        ></BlocProvider>;
      };

      mount(<Provider />);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("BLoC is undefined");
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
          bloc={() => new Test2(initialValue)}
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
      const remove = jest.fn();
      const bloc = new Test2(initialValue);
      bloc.addRemoveListener(remove);

      const Inner = () => {
        const [localState] = testState.useBloc(Test2);
        return <div>{localState}</div>;
      };

      const Provider = () => {
        return <BlocProvider
          bloc={bloc}
        >
          <Inner />
        </BlocProvider>;
      };

      const component = render(<Provider />);
      expect(remove).toHaveBeenCalledTimes(0);
      component.unmount();
      expect(remove).toHaveBeenCalledTimes(1);
      done();
    });

    it("should pass bloc as value, not function", function() {
      const initialValue = 88;
      const bloc = new Test2(initialValue);
      const Provider = () => {
        return <BlocProvider
          bloc={bloc}
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


  describe("withBlocProvider", () => {
    const Child = () => <div>Child</div>;

    it("should render with child", () => {
      const Comp = withBlocProvider(new Test2(2))(Child);
      const component = shallow(<Comp />);
      expect(component.find(Child).exists()).toBe(true);
    });

    it("should render with render with special name", () => {
      const Comp = withBlocProvider(new Test2(2))(Child);
      const component = shallow(<div><Comp /></div>);
      expect(component.find('withBlocProvider(Child)').exists()).toBe(true);
    });
  });
});