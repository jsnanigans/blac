import { describe, expect, it } from 'vitest';
import { Blac, Bloc, BlocBase, Cubit } from '.';

describe('first', () => {
  it('should export Blac', () => { expect(Blac).toBeDefined(); });
  it('should export BlocBase', () => { expect(BlocBase).toBeDefined(); });
  it('should export Bloc', () => { expect(Bloc).toBeDefined(); });
  it('should export Cubit', () => { expect(Cubit).toBeDefined(); });
 })
