import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac, BlacConfig } from '../index';

describe('Blac.config', () => {
  const originalConfig = { ...Blac.config };

  beforeEach(() => {
    // Reset to default config before each test
    Blac.setConfig({
      exposeBlacInstance: false,
      proxyDependencyTracking: true,
    });
  });

  afterEach(() => {
    // Restore original config after tests
    Blac.setConfig(originalConfig);
  });

  describe('setConfig', () => {
    it('should have default configuration', () => {
      expect(Blac.config).toEqual({
        exposeBlacInstance: false,
        proxyDependencyTracking: true,
      });
    });

    it('should update configuration with partial config', () => {
      Blac.setConfig({ proxyDependencyTracking: false });
      
      expect(Blac.config).toEqual({
        exposeBlacInstance: false,
        proxyDependencyTracking: false,
      });
    });

    it('should merge configuration properly', () => {
      Blac.setConfig({ exposeBlacInstance: true });
      Blac.setConfig({ proxyDependencyTracking: false });
      
      expect(Blac.config).toEqual({
        exposeBlacInstance: true,
        proxyDependencyTracking: false,
      });
    });

    it('should throw error for invalid proxyDependencyTracking type', () => {
      expect(() => {
        Blac.setConfig({ proxyDependencyTracking: 'true' as any });
      }).toThrow('BlacConfig.proxyDependencyTracking must be a boolean');
    });

    it('should throw error for invalid exposeBlacInstance type', () => {
      expect(() => {
        Blac.setConfig({ exposeBlacInstance: 1 as any });
      }).toThrow('BlacConfig.exposeBlacInstance must be a boolean');
    });

    it('should return a copy of config, not the original', () => {
      const config1 = Blac.config;
      const config2 = Blac.config;
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should not allow direct modification of config', () => {
      const config = Blac.config as any;
      config.proxyDependencyTracking = false;
      
      // Original config should remain unchanged
      expect(Blac.config.proxyDependencyTracking).toBe(true);
    });
  });

  describe('config type exports', () => {
    it('should allow typed config usage', () => {
      const testConfig: Partial<BlacConfig> = {
        proxyDependencyTracking: false,
      };
      
      Blac.setConfig(testConfig);
      expect(Blac.config.proxyDependencyTracking).toBe(false);
    });
  });
});