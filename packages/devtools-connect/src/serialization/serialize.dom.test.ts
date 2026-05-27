import { describe, it, expect } from 'vite-plus/test';
import { safeSerialize } from './serialize';

describe('serialize — DOM / React fiber defense', () => {
  it('serializes a DOM-like node as a placeholder without traversing it', () => {
    // Simulate a DOM node carrying React's fiber expando, which is a large
    // circular graph. If the serializer walked it, this would never return.
    const fiber: Record<string, unknown> = { tag: 5 };
    fiber.return = fiber; // circular
    fiber.child = fiber;

    const node = {
      nodeType: 1,
      nodeName: 'DIV',
      ['__reactFiber$abc']: fiber,
      ['__reactProps$abc']: { onClick: () => {} },
    };

    const res = safeSerialize({ display: node });
    expect(res.success).toBe(true);
    expect(res.data.display).toEqual({ __type: 'DOMNode', nodeName: 'DIV' });
  });

  it('skips React expando keys on plain objects too', () => {
    const fiber: Record<string, unknown> = {};
    fiber.self = fiber;
    const obj = { ok: 1, ['__reactFiber$xyz']: fiber };

    const res = safeSerialize(obj);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ ok: 1 });
  });
});
