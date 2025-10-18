import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac, BlacConfig } from '../index';

describe('Blac.config', () => {
  const originalConfig = { ...Blac.config };

  beforeEach(() => {
    // Reset to default config before each test
    Blac.setConfig({
      proxyDependencyTracking: true,
      proxyMaxDepth: 3,
    });
  });

  afterEach(() => {
    // Restore original config after tests
    Blac.setConfig(originalConfig);
  });

  describe('setConfig', () => {
    it('should have default configuration', () => {
      expect(Blac.config).toEqual({
        proxyDependencyTracking: true,
        proxyMaxDepth: 3,
      });
    });

    it('should update configuration with partial config', () => {
      Blac.setConfig({ proxyDependencyTracking: false });

      expect(Blac.config).toEqual({
        proxyDependencyTracking: false,
        proxyMaxDepth: 3,
      });
    });

    it('should merge configuration properly', () => {
      // First set to false
      Blac.setConfig({ proxyDependencyTracking: false });

      // Then set empty config - should keep false
      Blac.setConfig({});

      expect(Blac.config).toEqual({
        proxyDependencyTracking: false,
        proxyMaxDepth: 3,
      });
    });

    it('should throw error for invalid proxyDependencyTracking type', () => {
      expect(() => {
        Blac.setConfig({ proxyDependencyTracking: 'true' as any });
      }).toThrow('BlacConfig.proxyDependencyTracking must be a boolean');
    });

    it('should throw error for invalid proxyMaxDepth type', () => {
      expect(() => {
        Blac.setConfig({ proxyMaxDepth: 'fifty' as any });
      }).toThrow('BlacConfig.proxyMaxDepth must be a number');
    });

    it('should throw error for proxyMaxDepth less than 1', () => {
      expect(() => {
        Blac.setConfig({ proxyMaxDepth: 0 });
      }).toThrow('BlacConfig.proxyMaxDepth must be at least 1');
    });

    it('should throw error for non-integer proxyMaxDepth', () => {
      expect(() => {
        Blac.setConfig({ proxyMaxDepth: 3.5 });
      }).toThrow('BlacConfig.proxyMaxDepth must be an integer');
    });

    it('should accept valid proxyMaxDepth values', () => {
      Blac.setConfig({ proxyMaxDepth: 10 });
      expect(Blac.config.proxyMaxDepth).toBe(10);

      Blac.setConfig({ proxyMaxDepth: 1 });
      expect(Blac.config.proxyMaxDepth).toBe(1);

      Blac.setConfig({ proxyMaxDepth: 100 });
      expect(Blac.config.proxyMaxDepth).toBe(100);
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
