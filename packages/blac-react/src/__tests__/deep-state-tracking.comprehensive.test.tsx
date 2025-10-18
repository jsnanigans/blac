import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import React from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '../index';

interface NestedState {
  user: {
    profile: {
      name: string;
      address: {
        city: string;
        country: string;
      };
    };
    settings: {
      theme: string;
      notifications: boolean;
    };
  };
  items: Array<{
    id: number;
    name: string;
    tags: string[];
  }>;
  metadata: {
    version: number;
    timestamp: number;
  };
}

class NestedStateCubit extends Cubit<NestedState> {
  constructor() {
    super({
      user: {
        profile: {
          name: 'Alice',
          address: {
            city: 'NYC',
            country: 'USA',
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      },
      items: [
        { id: 1, name: 'Item 1', tags: ['tag1', 'tag2'] },
        { id: 2, name: 'Item 2', tags: ['tag3'] },
      ],
      metadata: {
        version: 1,
        timestamp: Date.now(),
      },
    });
  }

  updateCity = (city: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        profile: {
          ...this.state.user.profile,
          address: {
            ...this.state.user.profile.address,
            city,
          },
        },
      },
    });
  };

  updateTheme = (theme: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        settings: {
          ...this.state.user.settings,
          theme,
        },
      },
    });
  };

  updateItemName = (id: number, name: string) => {
    this.emit({
      ...this.state,
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, name } : item,
      ),
    });
  };

  addItem = (item: { id: number; name: string; tags: string[] }) => {
    this.emit({
      ...this.state,
      items: [...this.state.items, item],
    });
  };

  updateVersion = (version: number) => {
    this.emit({
      ...this.state,
      metadata: {
        ...this.state.metadata,
        version,
      },
    });
  };
}

describe('Deep State Tracking - Comprehensive Tests', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Selective Re-rendering', () => {
    beforeEach(() => {
      // Increase proxy depth to handle deep nesting tests (6+ levels)
      Blac.setConfig({
        proxyDependencyTracking: true,
        proxyMaxDepth: 10
      });
    });

    it('should only re-render when tracked deep property changes', async () => {
      let cityRenderCount = 0;
      let themeRenderCount = 0;

      const CityComponent = () => {
        const [state] = useBloc(NestedStateCubit);
        cityRenderCount++;
        return <div data-testid="city">{state.user.profile.address.city}</div>;
      };

      const ThemeComponent = () => {
        const [state] = useBloc(NestedStateCubit);
        themeRenderCount++;
        return <div data-testid="theme">{state.user.settings.theme}</div>;
      };

      render(
        <>
          <CityComponent />
          <ThemeComponent />
        </>,
      );

      expect(cityRenderCount).toBe(1);
      expect(themeRenderCount).toBe(1);

      const cubit = Blac.getBloc(NestedStateCubit);

      // Update city - should only re-render CityComponent
      await act(async () => {
        cubit.updateCity('LA');
      });

      expect(cityRenderCount).toBe(2);
      // V3 Leaf tracking: ThemeComponent should NOT re-render
      // It only tracks 'user.settings.theme', not 'user.profile.address.city'
      expect(themeRenderCount).toBe(1); // Should NOT re-render

      // Update theme - should only re-render ThemeComponent
      await act(async () => {
        cubit.updateTheme('light');
      });

      expect(cityRenderCount).toBe(2); // Should NOT re-render
      expect(themeRenderCount).toBe(2);
    });

    it('should handle very deep nesting (6+ levels)', async () => {
      interface DeepState {
        l1: {
          l2: {
            l3: {
              l4: {
                l5: {
                  l6: {
                    value: string;
                    sibling: string;
                  };
                };
              };
            };
          };
        };
      }

      class DeepCubit extends Cubit<DeepState> {
        constructor() {
          super({
            l1: {
              l2: {
                l3: {
                  l4: {
                    l5: {
                      l6: {
                        value: 'deep',
                        sibling: 'other',
                      },
                    },
                  },
                },
              },
            },
          });
        }

        updateValue = (value: string) => {
          this.emit({
            l1: {
              l2: {
                l3: {
                  l4: {
                    l5: {
                      l6: {
                        value,
                        sibling: this.state.l1.l2.l3.l4.l5.l6.sibling,
                      },
                    },
                  },
                },
              },
            },
          });
        };

        updateSibling = (sibling: string) => {
          this.emit({
            l1: {
              l2: {
                l3: {
                  l4: {
                    l5: {
                      l6: {
                        value: this.state.l1.l2.l3.l4.l5.l6.value,
                        sibling,
                      },
                    },
                  },
                },
              },
            },
          });
        };
      }

      Blac.resetInstance();
      let valueRenderCount = 0;
      let siblingRenderCount = 0;

      const ValueComponent = () => {
        const [state] = useBloc(DeepCubit);
        valueRenderCount++;
        return <div>{state.l1.l2.l3.l4.l5.l6.value}</div>;
      };

      const SiblingComponent = () => {
        const [state] = useBloc(DeepCubit);
        siblingRenderCount++;
        return <div>{state.l1.l2.l3.l4.l5.l6.sibling}</div>;
      };

      render(
        <>
          <ValueComponent />
          <SiblingComponent />
        </>,
      );

      const cubit = Blac.getBloc(DeepCubit);

      await act(async () => {
        cubit.updateValue('changed');
      });

      expect(valueRenderCount).toBe(2);
      // V3 Leaf tracking: Sibling should NOT re-render
      // ValueComponent only tracks 'l1.l2.l3.l4.l5.l6.value'
      // SiblingComponent only tracks 'l1.l2.l3.l4.l5.l6.sibling'
      expect(siblingRenderCount).toBe(1); // Should NOT re-render

      await act(async () => {
        cubit.updateSibling('changed');
      });

      expect(valueRenderCount).toBe(2); // Should NOT re-render
      expect(siblingRenderCount).toBe(2);
    });
  });

  describe('Array Operations', () => {
    it('should handle array element changes correctly', async () => {
      let item1RenderCount = 0;
      let item2RenderCount = 0;

      const Item1Component = () => {
        const [state] = useBloc(NestedStateCubit);
        item1RenderCount++;
        return <div data-testid="item1">{state.items[0]?.name || 'none'}</div>;
      };

      const Item2Component = () => {
        const [state] = useBloc(NestedStateCubit);
        item2RenderCount++;
        return <div data-testid="item2">{state.items[1]?.name || 'none'}</div>;
      };

      render(
        <>
          <Item1Component />
          <Item2Component />
        </>,
      );

      const cubit = Blac.getBloc(NestedStateCubit);

      // Update first item - should re-render ONLY Item1Component
      // V3 Leaf tracking: Item2Component tracks items[1].name, which didn't change
      await act(async () => {
        cubit.updateItemName(1, 'Updated Item 1');
      });

      expect(screen.getByTestId('item1')).toHaveTextContent('Updated Item 1');
      // Only Item1 should re-render (precise tracking)
      expect(item1RenderCount).toBe(2);
      expect(item2RenderCount).toBe(1); // Should NOT re-render (sibling isolation)
    });

    it('should handle array additions', async () => {
      let renderCount = 0;

      const ItemsComponent = () => {
        const [state] = useBloc(NestedStateCubit);
        renderCount++;
        return <div data-testid="count">{state.items.length}</div>;
      };

      render(<ItemsComponent />);

      expect(screen.getByTestId('count')).toHaveTextContent('2');

      const cubit = Blac.getBloc(NestedStateCubit);

      await act(async () => {
        cubit.addItem({ id: 3, name: 'Item 3', tags: [] });
      });

      expect(screen.getByTestId('count')).toHaveTextContent('3');
      expect(renderCount).toBe(2);
    });

    it('should track array methods (map, filter, join)', async () => {
      let renderCount = 0;

      const Component = () => {
        const [state] = useBloc(NestedStateCubit);
        renderCount++;
        return (
          <div>
            <div data-testid="names">{state.items.map((i) => i.name).join(', ')}</div>
            <div data-testid="count">{state.items.length}</div>
          </div>
        );
      };

      render(<Component />);

      expect(screen.getByTestId('names')).toHaveTextContent('Item 1, Item 2');
      expect(renderCount).toBe(1);

      const cubit = Blac.getBloc(NestedStateCubit);

      await act(async () => {
        cubit.addItem({ id: 3, name: 'Item 3', tags: [] });
      });

      expect(screen.getByTestId('names')).toHaveTextContent('Item 1, Item 2, Item 3');
      expect(renderCount).toBe(2);
    });
  });

  describe('Sibling Isolation', () => {
    it('should NOT re-render when sibling properties change', async () => {
      let cityRenderCount = 0;
      let versionRenderCount = 0;

      const CityComponent = () => {
        const [state] = useBloc(NestedStateCubit);
        cityRenderCount++;
        return <div>{state.user.profile.address.city}</div>;
      };

      const VersionComponent = () => {
        const [state] = useBloc(NestedStateCubit);
        versionRenderCount++;
        return <div>{state.metadata.version}</div>;
      };

      render(
        <>
          <CityComponent />
          <VersionComponent />
        </>,
      );

      const cubit = Blac.getBloc(NestedStateCubit);

      // These are siblings at the root level
      await act(async () => {
        cubit.updateCity('SF');
      });

      expect(cityRenderCount).toBe(2);
      expect(versionRenderCount).toBe(1); // Should NOT re-render

      await act(async () => {
        cubit.updateVersion(2);
      });

      expect(cityRenderCount).toBe(2); // Should NOT re-render
      expect(versionRenderCount).toBe(2);
    });
  });

  describe('Multiple Path Tracking', () => {
    it('should correctly track multiple paths in same component', async () => {
      let renderCount = 0;

      const Component = () => {
        const [state] = useBloc(NestedStateCubit);
        renderCount++;
        return (
          <div>
            <div data-testid="city">{state.user.profile.address.city}</div>
            <div data-testid="theme">{state.user.settings.theme}</div>
          </div>
        );
      };

      render(<Component />);

      const cubit = Blac.getBloc(NestedStateCubit);

      // Update city - should re-render
      await act(async () => {
        cubit.updateCity('Boston');
      });

      expect(renderCount).toBe(2);

      // Update theme - should re-render
      await act(async () => {
        cubit.updateTheme('light');
      });

      expect(renderCount).toBe(3);

      // Update unrelated field - should NOT re-render
      await act(async () => {
        cubit.updateVersion(5);
      });

      expect(renderCount).toBe(3); // Should NOT re-render
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined values in nested paths', async () => {
      interface NullableState {
        user: {
          profile: {
            name: string;
          } | null;
        } | null;
      }

      class NullableCubit extends Cubit<NullableState> {
        constructor() {
          super({
            user: {
              profile: {
                name: 'Alice',
              },
            },
          });
        }

        setProfileNull = () => {
          this.emit({
            user: {
              profile: null,
            },
          });
        };

        restoreProfile = () => {
          this.emit({
            user: {
              profile: {
                name: 'Bob',
              },
            },
          });
        };
      }

      Blac.resetInstance();
      let renderCount = 0;

      const Component = () => {
        const [state] = useBloc(NullableCubit);
        renderCount++;
        return <div>{state.user?.profile?.name || 'none'}</div>;
      };

      render(<Component />);

      const cubit = Blac.getBloc(NullableCubit);

      await act(async () => {
        cubit.setProfileNull();
      });

      expect(renderCount).toBe(2);

      await act(async () => {
        cubit.restoreProfile();
      });

      expect(renderCount).toBe(3);
    });

    it('should handle empty arrays', async () => {
      interface ArrayState {
        items: string[];
      }

      class ArrayCubit extends Cubit<ArrayState> {
        constructor() {
          super({ items: [] });
        }

        addItem = (item: string) => {
          this.emit({ items: [...this.state.items, item] });
        };

        clear = () => {
          this.emit({ items: [] });
        };
      }

      Blac.resetInstance();
      let renderCount = 0;

      const Component = () => {
        const [state] = useBloc(ArrayCubit);
        renderCount++;
        return <div>{state.items.join(',')}</div>;
      };

      render(<Component />);

      const cubit = Blac.getBloc(ArrayCubit);

      await act(async () => {
        cubit.addItem('first');
      });

      expect(renderCount).toBe(2);

      await act(async () => {
        cubit.clear();
      });

      expect(renderCount).toBe(3);
    });
  });
});
