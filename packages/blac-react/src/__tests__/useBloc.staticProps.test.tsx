import { Blac, Cubit } from '@blac/core';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import useBloc from '../useBloc';

// Test components
interface UserDetailsProps {
  userId: string;
  page: number;
}

interface UserDetailsState {
  user: { id: string; name: string } | null;
  loading: boolean;
  page: number;
}

class UserDetailsCubit extends Cubit<UserDetailsState> {
  props: ConstructorParameters<typeof UserDetailsCubit>[0];

  constructor(props: UserDetailsProps) {
    super({ user: null, loading: false, page: props.page });
    this.props = props;
  }

  loadUser = () => {
    this.emit({ ...this.state, loading: true });
    // Simulate API call
    setTimeout(() => {
      this.emit({
        ...this.state,
        user: { id: this.props!.userId, name: `User ${this.props!.userId}` },
        loading: false,
      });
    }, 10);
  };
}

interface SearchProps {
  query: string;
  filters?: { category?: string; minPrice?: number; tags?: string[] };
}

interface SearchState {
  results: string[];
  loading: boolean;
}

class SearchCubit extends Cubit<SearchState> {
  constructor(props: SearchProps) {
    super({ results: [], loading: false });
  }
}

describe('useBloc staticProps integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.clearAllMocks();
  });

  describe('staticProps with instanceId', () => {
    it('should use explicit instanceId when provided with staticProps', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user123', page: 1 },
          instanceId: 'user123',
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user123', page: 2 }, // Different page
          instanceId: 'user123', // Same instanceId
        }),
      );

      // Both should have the same instanceId
      expect(result1.current[1]._id).toBe('user123');
      expect(result2.current[1]._id).toBe('user123');

      // Note: In React Testing Library, each renderHook creates a separate component tree,
      // so they won't share the same instance. In a real app, they would.
      expect(result1.current[1]._id).toBe(result2.current[1]._id);
    });

    it('should create different instances with different instanceIds', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user123', page: 1 },
          instanceId: 'user123',
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user456', page: 1 },
          instanceId: 'user456',
        }),
      );

      // Should have different IDs
      expect(result1.current[1]._id).toBe('user123');
      expect(result2.current[1]._id).toBe('user456');
      expect(result1.current[1]._id).not.toBe(result2.current[1]._id);
    });
  });

  describe('staticProps without instanceId (auto-generation)', () => {
    it('should generate instanceId from primitive staticProps values', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: { query: 'test', filters: { category: 'books' } },
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: { query: 'test', filters: { category: 'movies' } },
        }),
      );

      // Should have generated ID from the query primitive
      expect(result1.current[1]._id).toBe('query:test');
      expect(result2.current[1]._id).toBe('query:test');

      // They have the same generated ID
      expect(result1.current[1]._id).toBe(result2.current[1]._id);
    });

    it('should create different instances for different primitive values', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: { query: 'test1' },
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: { query: 'test2' },
        }),
      );

      // Should have different generated IDs
      expect(result1.current[1]._id).toBe('query:test1');
      expect(result2.current[1]._id).toBe('query:test2');
      expect(result1.current[1]._id).not.toBe(result2.current[1]._id);
    });

    it('should ignore non-primitive values when generating instanceId', () => {
      const filters = { category: 'books', tags: ['fiction', 'bestseller'] };

      const { result: result1 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: { query: 'test', filters }, // filters has an array
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(SearchCubit, {
          staticProps: {
            query: 'test',
            filters: { ...filters, tags: ['different'] },
          },
        }),
      );

      // Both should generate the same ID (only 'query' is used)
      expect(result1.current[1]._id).toBe('query:test');
      expect(result2.current[1]._id).toBe('query:test');
    });
  });

  describe('InstanceId usage', () => {
    it('should use instanceId option', () => {
      const { result } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user123', page: 1 },
          instanceId: 'custom-id',
        }),
      );

      expect(result.current[1]._id).toBe('custom-id');
    });

    it('should use instanceId option with static props', () => {
      const { result } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'user123', page: 1 },
          instanceId: 'user123',
        }),
      );

      const [state, bloc] = result.current;
      expect(state.page).toBe(1);
      expect(bloc).toBeDefined();
      expect(bloc._id).toBe('user123');
    });

    it('should use explicit instanceId when provided', () => {
      const { result } = renderHook(() =>
        useBloc(UserDetailsCubit, {
          staticProps: { userId: 'new', page: 2 },
          instanceId: 'new-id',
        }),
      );

      // Should use the instanceId
      expect(result.current[1]._id).toBe('new-id');

      // Should use staticProps
      expect(result.current[1].props).toEqual({ userId: 'new', page: 2 });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed primitive types in staticProps', () => {
      interface ConfigProps {
        enabled: boolean;
        maxRetries: number;
        apiKey: string;
        debugInfo?: { level: string };
      }

      class ConfigCubit extends Cubit<{ config: ConfigProps | null }> {
        constructor(props: ConfigProps) {
          super({ config: props });
        }
      }

      const { result: result1 } = renderHook(() =>
        useBloc(ConfigCubit, {
          staticProps: {
            enabled: true,
            maxRetries: 3,
            apiKey: 'abc123',
            debugInfo: { level: 'verbose' }, // This should be ignored
          },
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(ConfigCubit, {
          staticProps: {
            enabled: true,
            maxRetries: 3,
            apiKey: 'abc123',
            debugInfo: { level: 'quiet' }, // Different object, but should still match
          },
        }),
      );

      // Should generate the same ID from primitives
      const expectedId = 'apiKey:abc123|enabled:true|maxRetries:3';
      expect(result1.current[1]._id).toBe(expectedId);
      expect(result2.current[1]._id).toBe(expectedId);
    });

    it('should handle null and undefined in staticProps', () => {
      interface OptionalProps {
        required: string;
        optional?: string;
        nullable: string | null;
      }

      class OptionalCubit extends Cubit<{ data: any }> {
        constructor(props: OptionalProps) {
          super({ data: props });
        }
      }

      const { result: result1 } = renderHook(() =>
        useBloc(OptionalCubit, {
          staticProps: {
            required: 'test',
            optional: undefined,
            nullable: null,
          },
        }),
      );

      const { result: result2 } = renderHook(() =>
        useBloc(OptionalCubit, {
          staticProps: {
            required: 'test',
            optional: undefined,
            nullable: null,
          },
        }),
      );

      // Should generate the same ID including null/undefined
      const expectedId = 'nullable:null|optional:undefined|required:test';
      expect(result1.current[1]._id).toBe(expectedId);
      expect(result2.current[1]._id).toBe(expectedId);
    });
  });
});
