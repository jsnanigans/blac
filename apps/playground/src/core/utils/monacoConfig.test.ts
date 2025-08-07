import { describe, it, expect } from 'vitest';
import { blacCoreTypes, blacReactTypes, reactTypes } from './monacoConfig';

describe('Monaco Configuration', () => {
  it('should export BlaC core type definitions', () => {
    expect(blacCoreTypes).toBeDefined();
    expect(blacCoreTypes).toContain('@blac/core');
    expect(blacCoreTypes).toContain('Cubit');
    expect(blacCoreTypes).toContain('Bloc');
    expect(blacCoreTypes).toContain('BlocBase');
  });

  it('should export BlaC React type definitions', () => {
    expect(blacReactTypes).toBeDefined();
    expect(blacReactTypes).toContain('@blac/react');
    expect(blacReactTypes).toContain('useBloc');
    expect(blacReactTypes).toContain('useExternalBlocStore');
  });

  it('should export React type definitions', () => {
    expect(reactTypes).toBeDefined();
    expect(reactTypes).toContain('useState');
    expect(reactTypes).toContain('useEffect');
    expect(reactTypes).toContain('FunctionComponent');
  });
});