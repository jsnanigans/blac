import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { acquire, hasInstance, getRefCount } from '../registry';

// --- Test blocs ---

class AuthBloc extends Cubit<{ loggedIn: boolean; userId: string }> {
  constructor() {
    super({ loggedIn: false, userId: '' });
  }

  login(userId: string) {
    this.emit({ loggedIn: true, userId });
  }

  logout() {
    this.emit({ loggedIn: false, userId: '' });
  }
}

class SettingsBloc extends Cubit<{ theme: string }> {
  constructor() {
    super({ theme: 'light' });
  }

  setTheme(theme: string) {
    this.emit({ theme });
  }
}

class CartBloc extends Cubit<{ items: string[] }> {
  static keepAlive = true;

  constructor() {
    super({ items: [] });
  }

  addItem(item: string) {
    this.update((s) => ({ items: [...s.items, item] }));
  }
}

describe('StateContainer.depend()', () => {
  blacTestSetup();

  describe('multiple dependencies', () => {
    class DashboardBloc extends Cubit<{ ready: boolean }> {
      getAuth = this.depend(AuthBloc);
      getSettings = this.depend(SettingsBloc);

      constructor() {
        super({ ready: false });
      }
    }

    it('tracks all declared dependencies', () => {
      const dashboard = new DashboardBloc();

      expect(dashboard.dependencies.size).toBe(2);
      expect(dashboard.dependencies.has(AuthBloc)).toBe(true);
      expect(dashboard.dependencies.has(SettingsBloc)).toBe(true);
    });

    it('resolves each dependency independently', () => {
      const dashboard = new DashboardBloc();
      const auth = dashboard.getAuth();
      const settings = dashboard.getSettings();

      expect(auth).toBeInstanceOf(AuthBloc);
      expect(settings).toBeInstanceOf(SettingsBloc);
      expect(auth).not.toBe(settings);
    });
  });

  describe('reading and reacting to dependency state', () => {
    class ProfileBloc extends Cubit<{ display: string }> {
      getAuth = this.depend(AuthBloc);

      constructor() {
        super({ display: '' });
      }

      refresh() {
        const auth = this.getAuth();
        this.emit({
          display: auth.state.loggedIn ? `User: ${auth.state.userId}` : 'Guest',
        });
      }
    }

    it('reads current state from dependency', () => {
      const profile = new ProfileBloc();
      profile.refresh();

      expect(profile.state.display).toBe('Guest');
    });

    it('sees updated dependency state on subsequent reads', () => {
      const profile = new ProfileBloc();
      const auth = profile.getAuth();

      auth.login('alice');
      profile.refresh();

      expect(profile.state.display).toBe('User: alice');
    });

    it('reflects dependency state changes across multiple updates', () => {
      const profile = new ProfileBloc();
      const auth = profile.getAuth();

      auth.login('bob');
      profile.refresh();
      expect(profile.state.display).toBe('User: bob');

      auth.logout();
      profile.refresh();
      expect(profile.state.display).toBe('Guest');
    });
  });

  describe('chain dependencies (A → B → C)', () => {
    class ServiceC extends Cubit<{ data: string }> {
      constructor() {
        super({ data: 'from-c' });
      }
    }

    class ServiceB extends Cubit<{ value: string }> {
      getC = this.depend(ServiceC);

      constructor() {
        super({ value: '' });
      }

      load() {
        const c = this.getC();
        this.emit({ value: c.state.data });
      }
    }

    class ServiceA extends Cubit<{ result: string }> {
      getB = this.depend(ServiceB);

      constructor() {
        super({ result: '' });
      }

      load() {
        const b = this.getB();
        b.load();
        this.emit({ result: b.state.value });
      }
    }

    it('resolves transitive dependencies', () => {
      const a = new ServiceA();
      a.load();

      expect(a.state.result).toBe('from-c');
    });

    it('all instances in the chain share via registry', () => {
      const a = new ServiceA();
      a.load();

      expect(hasInstance(ServiceB)).toBe(true);
      expect(hasInstance(ServiceC)).toBe(true);
    });
  });

  describe('multiple owners sharing same dependency', () => {
    class BlocX extends Cubit<{ x: number }> {
      getAuth = this.depend(AuthBloc);
      constructor() {
        super({ x: 0 });
      }
    }

    class BlocY extends Cubit<{ y: number }> {
      getAuth = this.depend(AuthBloc);
      constructor() {
        super({ y: 0 });
      }
    }

    it('returns the same dependency instance to both owners', () => {
      const x = new BlocX();
      const y = new BlocY();

      expect(x.getAuth()).toBe(y.getAuth());
    });

    it('both see state changes from the shared dependency', () => {
      const x = new BlocX();
      const y = new BlocY();

      x.getAuth().login('shared-user');

      expect(y.getAuth().state.loggedIn).toBe(true);
      expect(y.getAuth().state.userId).toBe('shared-user');
    });
  });

  describe('dependency with keepAlive target', () => {
    class OrderBloc extends Cubit<{ total: number }> {
      getCart = this.depend(CartBloc);
      constructor() {
        super({ total: 0 });
      }
    }

    it('resolves keepAlive dependency', () => {
      const order = new OrderBloc();
      const cart = order.getCart();

      expect(cart).toBeInstanceOf(CartBloc);
      cart.addItem('widget');
      expect(cart.state.items).toEqual(['widget']);
    });

    it('keepAlive dependency persists after owner is gone', () => {
      const order = new OrderBloc();
      const cart = order.getCart();
      cart.addItem('thing');

      // Owner goes away — dependency should still be in registry
      expect(hasInstance(CartBloc)).toBe(true);
      expect(cart.state.items).toEqual(['thing']);
    });
  });

  describe('pre-existing instances', () => {
    class ConsumerBloc extends Cubit<{ val: number }> {
      getAuth = this.depend(AuthBloc);
      constructor() {
        super({ val: 0 });
      }
    }

    it('returns pre-existing instance from registry', () => {
      const existing = acquire(AuthBloc);
      existing.login('pre-existing');

      const consumer = new ConsumerBloc();
      const auth = consumer.getAuth();

      expect(auth).toBe(existing);
      expect(auth.state.userId).toBe('pre-existing');
    });

    it('does not increment refCount on pre-existing instance', () => {
      acquire(AuthBloc);
      expect(getRefCount(AuthBloc)).toBe(1);

      const consumer = new ConsumerBloc();
      consumer.getAuth();

      expect(getRefCount(AuthBloc)).toBe(1);
    });
  });

  describe('instance key variations', () => {
    class MultiKeyBloc extends Cubit<{ n: number }> {
      getPrimary = this.depend(SettingsBloc, 'primary');
      getSecondary = this.depend(SettingsBloc, 'secondary');

      constructor() {
        super({ n: 0 });
      }
    }

    it('resolves different instances for different keys of same type', () => {
      const bloc = new MultiKeyBloc();
      const primary = bloc.getPrimary();
      const secondary = bloc.getSecondary();

      expect(primary).not.toBe(secondary);
      expect(primary).toBeInstanceOf(SettingsBloc);
      expect(secondary).toBeInstanceOf(SettingsBloc);
    });

    it('tracks last key per type in dependencies map', () => {
      const bloc = new MultiKeyBloc();

      // Map keyed by constructor, so second depend() for same type overwrites
      expect(bloc.dependencies.get(SettingsBloc)).toBe('secondary');
    });

    it('state is independent per key', () => {
      const bloc = new MultiKeyBloc();
      const primary = bloc.getPrimary();
      const secondary = bloc.getSecondary();

      primary.setTheme('dark');

      expect(primary.state.theme).toBe('dark');
      expect(secondary.state.theme).toBe('light');
    });
  });

  describe('owner lifecycle', () => {
    class OwnerBloc extends Cubit<{ v: number }> {
      getAuth = this.depend(AuthBloc);
      constructor() {
        super({ v: 0 });
      }
    }

    it('accessor still works after owner is disposed', () => {
      const owner = new OwnerBloc();
      const accessor = owner.getAuth;

      owner.dispose();

      // accessor is a plain closure — still functional
      const auth = accessor();
      expect(auth).toBeInstanceOf(AuthBloc);
    });

    it('disposing owner does not affect dependency', () => {
      const owner = new OwnerBloc();
      const auth = owner.getAuth();
      auth.login('test');

      owner.dispose();

      expect(auth.isDisposed).toBe(false);
      expect(auth.state.userId).toBe('test');
    });
  });

  describe('each owner instance has independent dependencies map', () => {
    class IndBloc extends Cubit<{ n: number }> {
      getAuth = this.depend(AuthBloc);
      constructor() {
        super({ n: 0 });
      }
    }

    it('two instances of same class have separate dependency maps', () => {
      const a = new IndBloc();
      const b = new IndBloc();

      expect(a.dependencies).not.toBe(b.dependencies);
      expect(a.dependencies.size).toBe(1);
      expect(b.dependencies.size).toBe(1);
    });
  });

  describe('dependencies getter', () => {
    class SomeBloc extends Cubit<{ n: number }> {
      constructor() {
        super({ n: 0 });
      }
    }

    it('returns empty map when no depend() calls', () => {
      const bloc = new SomeBloc();
      expect(bloc.dependencies.size).toBe(0);
    });

    it('returns stable empty map reference across instances', () => {
      const a = new SomeBloc();
      const b = new SomeBloc();

      // Both should return the same EMPTY_DEPS singleton
      expect(a.dependencies).toBe(b.dependencies);
    });
  });

  describe('Cubit-to-Cubit communication', () => {
    class NotificationBloc extends Cubit<{ messages: string[] }> {
      constructor() {
        super({ messages: [] });
      }

      push(msg: string) {
        this.update((s) => ({ messages: [...s.messages, msg] }));
      }
    }

    class CheckoutBloc extends Cubit<{ status: string }> {
      getAuth = this.depend(AuthBloc);
      getCart = this.depend(CartBloc);
      getNotifications = this.depend(NotificationBloc);

      constructor() {
        super({ status: 'idle' });
      }

      checkout() {
        const auth = this.getAuth();
        const cart = this.getCart();
        const notifications = this.getNotifications();

        if (!auth.state.loggedIn) {
          this.emit({ status: 'error: not logged in' });
          return;
        }

        if (cart.state.items.length === 0) {
          this.emit({ status: 'error: cart empty' });
          return;
        }

        notifications.push(`Order placed: ${cart.state.items.length} item(s)`);
        this.emit({ status: 'completed' });
      }
    }

    it('orchestrates across multiple dependencies', () => {
      const checkout = new CheckoutBloc();

      // Not logged in
      checkout.checkout();
      expect(checkout.state.status).toBe('error: not logged in');

      // Log in but empty cart
      checkout.getAuth().login('buyer');
      checkout.checkout();
      expect(checkout.state.status).toBe('error: cart empty');

      // Add items and checkout
      checkout.getCart().addItem('book');
      checkout.getCart().addItem('pen');
      checkout.checkout();
      expect(checkout.state.status).toBe('completed');

      // Verify notification was pushed
      expect(checkout.getNotifications().state.messages).toEqual([
        'Order placed: 2 item(s)',
      ]);
    });
  });
});
