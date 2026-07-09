import { nothing } from 'lit-html';
import { directive, type ElementPart } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import {
  asTrackable,
  expandWithAncestors,
  trackedBloc,
  trackRender,
  ProxyCache,
  emptyPathSet,
  type PathSet,
} from './internal/track';
import type { Binding } from './live';

type Settable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

class ModelDirective extends AsyncDirective {
  private cache = new ProxyCache();
  private unsub?: () => void;
  private interest: PathSet = emptyPathSet();
  private el?: Settable;
  private listener?: () => void;
  private binding!: Binding;
  private setter!: (value: any) => void;

  render(_binding: Binding, _setter: (value: any) => void): unknown {
    return nothing;
  }

  update(
    part: ElementPart,
    [binding, setter]: [Binding, (value: any) => void],
  ): unknown {
    this.binding = binding;
    this.setter = setter;
    if (!this.el) {
      this.el = part.element as Settable;
      this.listener = () => {
        const el = this.el as HTMLInputElement;
        this.setter(el.type === 'checkbox' ? el.checked : el.value);
      };
      this.el.addEventListener('input', this.listener);
      this.el.addEventListener('change', this.listener);
    }
    if (this.isConnected && !this.unsub) this.subscribe();
    this.apply();
    return nothing;
  }

  private readValue(): unknown {
    const t = asTrackable(this.binding.bloc);
    const tracked = trackRender(t.state, t.interner, this.cache);
    const value = this.binding.read(
      tracked.value,
      trackedBloc(this.binding.bloc, tracked.value),
    );
    queueMicrotask(tracked.disarm);
    this.interest = expandWithAncestors(tracked.paths, t.interner);
    return value;
  }

  private apply(): void {
    const el = this.el as HTMLInputElement | undefined;
    if (!el) return;
    const value = this.readValue();
    if (el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else {
      const next = value == null ? '' : String(value);
      if (el.value !== next) el.value = next;
    }
  }

  private subscribe(): void {
    this.unsub = asTrackable(this.binding.bloc).channel.subscribe(
      () => this.interest,
      () => this.apply(),
    );
  }

  protected disconnected(): void {
    this.unsub?.();
    this.unsub = undefined;
    if (this.el && this.listener) {
      this.el.removeEventListener('input', this.listener);
      this.el.removeEventListener('change', this.listener);
    }
  }
  protected reconnected(): void {
    if (this.el && this.listener) {
      this.el.addEventListener('input', this.listener);
      this.el.addEventListener('change', this.listener);
    }
    this.subscribe();
  }
}

const modelDirective = directive(ModelDirective);

/** Two-way bind: reads the Binding into the element's value, writes via `setter` on input. */
export function model(binding: Binding, setter: (value: any) => void): unknown {
  return modelDirective(binding, setter);
}
