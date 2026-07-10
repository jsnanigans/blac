import { nothing } from 'lit-html';
import { directive, type ElementPart } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import { BindingSession } from './internal/binding-session';
import { getBindingMeta, type Binding } from './live';

type Settable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type WriteEvent = 'input' | 'change';

function isSettableElement(value: EventTarget | null): value is Settable {
  if (!value || typeof value !== 'object') return false;

  const localName = (value as { localName?: unknown }).localName;
  return (
    typeof localName === 'string' &&
    (localName.toLowerCase() === 'input' ||
      localName.toLowerCase() === 'textarea' ||
      localName.toLowerCase() === 'select')
  );
}

function modelElement(part: ElementPart): Settable {
  const element = (part as { element?: unknown }).element;
  if (!isSettableElement(element as EventTarget | null)) {
    throw new Error(
      'model() must be used as an element directive on an <input>, <textarea>, or <select>.',
    );
  }

  const input = element as HTMLInputElement;
  if (input.localName.toLowerCase() === 'input' && input.type === 'file') {
    throw new Error('model() does not support <input type="file">.');
  }

  return element as Settable;
}

function writeEventFor(element: Settable): WriteEvent {
  const tagName = element.localName.toLowerCase();
  if (tagName === 'select') return 'change';
  if (tagName === 'input') {
    const type = (element as HTMLInputElement).type;
    if (type === 'checkbox' || type === 'radio') return 'change';
  }
  return 'input';
}

class ModelDirective extends AsyncDirective {
  private el?: Settable;
  private writeEvent?: WriteEvent;
  private listenerAttached = false;
  private setter!: (value: any) => void;
  private readonly listener = (event: Event) => {
    const element = event.currentTarget;
    if (!isSettableElement(element)) return;
    if (element.localName.toLowerCase() === 'input') {
      const input = element as HTMLInputElement;
      if (input.type === 'checkbox') {
        this.setter(input.checked);
        return;
      }
      if (input.type === 'number' || input.type === 'range') {
        this.setter(input.valueAsNumber);
        return;
      }
    }
    this.setter(element.value);
  };
  private readonly session = new BindingSession<unknown>((value) => {
    this.applyValue(value);
  });

  render(_binding: Binding, _setter: (value: any) => void): unknown {
    return nothing;
  }

  update(
    part: ElementPart,
    [binding, setter]: [Binding, (value: any) => void],
  ): unknown {
    this.setter = setter;
    this.setElement(modelElement(part));
    const { bloc, read } = getBindingMeta(binding);
    const value = this.session.compute(bloc, read);
    if (this.isConnected) this.session.connect();
    this.applyValue(value);
    return nothing;
  }

  private setElement(element: Settable): void {
    if (this.el === element) return;

    this.detachListener();
    this.el = element;
    this.writeEvent = writeEventFor(element);
    if (this.isConnected) this.attachListener();
  }

  private attachListener(): void {
    if (!this.el || !this.writeEvent || this.listenerAttached) return;
    this.el.addEventListener(this.writeEvent, this.listener);
    this.listenerAttached = true;
  }

  private detachListener(): void {
    if (!this.el || !this.writeEvent || !this.listenerAttached) return;
    this.el.removeEventListener(this.writeEvent, this.listener);
    this.listenerAttached = false;
  }

  private applyValue(value: unknown): void {
    const el = this.el as HTMLInputElement | undefined;
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else {
      const next = value == null ? '' : String(value);
      if (el.value !== next) el.value = next;
    }
  }

  protected disconnected(): void {
    try {
      this.session.disconnect();
    } finally {
      this.detachListener();
    }
  }
  protected reconnected(): void {
    this.attachListener();
    this.session.reconnect();
  }
}

const modelDirective = directive(ModelDirective);

/** Two-way bind: reads into the element, writes via its default control event. */
export function model<T>(
  binding: Binding<T>,
  setter: (value: T) => void,
): unknown {
  return modelDirective(binding, setter);
}
