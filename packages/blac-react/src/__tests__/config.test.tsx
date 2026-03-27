import { describe, it, expect, afterEach } from 'vite-plus/test';
import {
  configureBlacReact,
  getBlacReactConfig,
  resetBlacReactConfig,
} from '../config';

describe('blac-react config', () => {
  afterEach(() => {
    resetBlacReactConfig();
  });

  it('default config has autoTrack: true', () => {
    expect(getBlacReactConfig().autoTrack).toBe(true);
  });

  it('configureBlacReact({ autoTrack: false }) updates global config', () => {
    configureBlacReact({ autoTrack: false });
    expect(getBlacReactConfig().autoTrack).toBe(false);
  });

  it('partial merge — unspecified keys retain defaults', () => {
    configureBlacReact({});
    expect(getBlacReactConfig().autoTrack).toBe(true);
  });

  it('resetBlacReactConfig() restores all keys to defaults', () => {
    configureBlacReact({ autoTrack: false });
    resetBlacReactConfig();
    expect(getBlacReactConfig().autoTrack).toBe(true);
  });

  it('multiple sequential calls — last write wins per key', () => {
    configureBlacReact({ autoTrack: false });
    configureBlacReact({ autoTrack: true });
    expect(getBlacReactConfig().autoTrack).toBe(true);
  });
});
