import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bloc } from '../Bloc';
import { Cubit } from '../Cubit';
import { PropsUpdated } from '../events';
import { BlacAdapter } from '../adapter/BlacAdapter';
import { Blac } from '../Blac';

// Test types
interface TestProps {
  query: string;
  filters?: string[];
}

interface TestState {
  data: string;
  loading: boolean;
}

// Test Cubit with props
class TestCubit extends Cubit<TestState, TestProps> {
  onPropsChangedMock = vi.fn();

  constructor() {
    super({ data: '', loading: false });
  }

  protected onPropsChanged(oldProps: TestProps | undefined, newProps: TestProps): void {
    this.onPropsChangedMock(oldProps, newProps);
    if (oldProps?.query !== newProps.query) {
      this.emit({ ...this.state, data: `Query: ${newProps.query}` });
    }
  }

  loadData = () => {
    const query = this.props?.query ?? 'default';
    this.emit({ data: `Loaded: ${query}`, loading: false });
  };
}

// Test Bloc with props
class TestBloc extends Bloc<TestState, PropsUpdated<TestProps>> {
  constructor() {
    super({ data: '', loading: false });

    this.on(PropsUpdated<TestProps>, (event, emit) => {
      emit({ ...this.state, data: `Props: ${event.props.query}` });
    });
  }
}

describe('Props functionality', () => {
  beforeEach(() => {
    // Clear Blac instance between tests
    Blac.resetInstance();
  });

  describe('PropsUpdated event', () => {
    it('should create PropsUpdated event with correct props', () => {
      const props = { query: 'test', filters: ['a', 'b'] };
      const event = new PropsUpdated(props);
      
      expect(event.props).toEqual(props);
      expect(event.props).toBe(props); // Should be the same reference
    });
  });

  describe('Cubit props support', () => {
    it('should support props getter', () => {
      const cubit = new TestCubit();
      expect(cubit.props).toBeNull();
    });

    it('should update props via _updateProps', () => {
      const cubit = new TestCubit();
      const props = { query: 'test' };
      
      (cubit as any)._updateProps(props);
      
      expect(cubit.props).toEqual(props);
      expect(cubit.onPropsChangedMock).toHaveBeenCalledWith(null, props);
    });

    it('should emit state when props change', () => {
      const cubit = new TestCubit();
      const props1 = { query: 'test1' };
      const props2 = { query: 'test2' };
      
      (cubit as any)._updateProps(props1);
      expect(cubit.state.data).toBe('Query: test1');
      
      (cubit as any)._updateProps(props2);
      expect(cubit.state.data).toBe('Query: test2');
    });

    it('should access props in methods', () => {
      const cubit = new TestCubit();
      
      cubit.loadData();
      expect(cubit.state.data).toBe('Loaded: default');
      
      (cubit as any)._updateProps({ query: 'custom' });
      cubit.loadData();
      expect(cubit.state.data).toBe('Loaded: custom');
    });
  });

  describe('Bloc props support', () => {
    it('should handle PropsUpdated events', async () => {
      const bloc = new TestBloc();
      const props = { query: 'search' };
      
      await bloc.add(new PropsUpdated(props));
      
      expect(bloc.state.data).toBe('Props: search');
    });

    it('should queue PropsUpdated events like any other event', async () => {
      const bloc = new TestBloc();
      
      await bloc.add(new PropsUpdated({ query: 'first' }));
      await bloc.add(new PropsUpdated({ query: 'second' }));
      
      expect(bloc.state.data).toBe('Props: second');
    });
  });

  describe('BlacAdapter props ownership', () => {
    it('should allow first adapter to own props', () => {
      const Constructor = TestCubit as any;
      const adapter1 = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        { props: { query: 'test1' } }
      );
      
      expect(() => {
        adapter1.updateProps({ query: 'test2' });
      }).not.toThrow();
    });

    it('should prevent non-owner adapters from updating props', () => {
      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});
      const Constructor = TestCubit as any;
      
      // First adapter becomes owner
      const adapter1 = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        { props: { query: 'test1' } }
      );
      
      // Second adapter tries to update props
      const adapter2 = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        {}
      );
      
      adapter2.updateProps({ query: 'hijack' });
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('non-owner adapter')
      );
      
      warnSpy.mockRestore();
    });

    it('should clear ownership on adapter unmount', () => {
      const Constructor = TestCubit as any;
      const adapter1 = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        { props: { query: 'test1' } }
      );
      
      adapter1.mount();
      adapter1.unmount();
      
      // New adapter should be able to take ownership
      const adapter2 = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        { props: { query: 'test2' } }
      );
      
      expect(() => {
        adapter2.updateProps({ query: 'test3' });
      }).not.toThrow();
    });

    it('should not update props if they are shallowly equal', () => {
      const cubit = new TestCubit();
      const Constructor = TestCubit as any;
      const adapter = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        {}
      );
      
      const props = { query: 'test' };
      adapter.updateProps(props);
      
      // Reset mock
      cubit.onPropsChangedMock.mockClear();
      
      // Update with same props
      adapter.updateProps({ query: 'test' });
      
      // onPropsChanged should not have been called
      expect(cubit.onPropsChangedMock).not.toHaveBeenCalled();
    });

    it('should ignore props updates during disposal', () => {
      const Constructor = TestCubit as any;
      const adapter = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        { props: { query: 'test1' } }
      );
      
      // Force disposal state
      (adapter.blocInstance as any)._disposalState = 'disposing';
      
      expect(() => {
        adapter.updateProps({ query: 'test2' });
      }).not.toThrow();
      
      // Props should not have been updated
      expect((adapter.blocInstance as TestCubit).props?.query).toBe('test1');
    });
  });

  describe('Props integration', () => {
    it('should dispatch PropsUpdated for Bloc instances', async () => {
      const Constructor = TestBloc as any;
      const adapter = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        {}
      );
      
      const bloc = adapter.blocInstance as TestBloc;
      adapter.updateProps({ query: 'adapter-test' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(bloc.state.data).toBe('Props: adapter-test');
    });

    it('should call _updateProps for Cubit instances', () => {
      const Constructor = TestCubit as any;
      const adapter = new BlacAdapter(
        { componentRef: { current: {} }, blocConstructor: Constructor },
        {}
      );
      
      adapter.updateProps({ query: 'adapter-test' });
      
      expect((adapter.blocInstance as TestCubit).props?.query).toBe('adapter-test');
      expect((adapter.blocInstance as TestCubit).state.data).toBe('Query: adapter-test');
    });
  });
});