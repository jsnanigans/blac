import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac, BlacConfig } from '../index';

describe('Blac.config', () => {
  const originalConfig = { ...Blac.config };

  beforeEach(() => {
    // Reset to default config before each test
    Blac.setConfig({
      proxyDependencyTracking: true,
      disposalTimeout: 100,
      strictModeCompatibility: true,
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
        disposalTimeout: 100,
        strictModeCompatibility: true,
      });
    });

    it('should update configuration with partial config', () => {
      Blac.setConfig({ proxyDependencyTracking: false });

      expect(Blac.config).toEqual({
        proxyDependencyTracking: false,
        disposalTimeout: 100,
        strictModeCompatibility: true,
      });
    });

    it('should merge configuration properly', () => {
      // First set to false
      Blac.setConfig({ proxyDependencyTracking: false });

      // Then set empty config - should keep false
      Blac.setConfig({});

      expect(Blac.config).toEqual({
        proxyDependencyTracking: false,
        disposalTimeout: 100,
        strictModeCompatibility: true,
      });
    });

    it('should throw error for invalid proxyDependencyTracking type', () => {
      expect(() => {
        Blac.setConfig({ proxyDependencyTracking: 'true' as any });
      }).toThrow('BlacConfig.proxyDependencyTracking must be a boolean');
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

  describe('Disposal Configuration', () => {
    it('should accept valid disposalTimeout', () => {
      Blac.setConfig({ disposalTimeout: 100 });
      expect(Blac.config.disposalTimeout).toBe(100);
    });

    it('should accept 0 as disposalTimeout', () => {
      Blac.setConfig({ disposalTimeout: 0 });
      expect(Blac.config.disposalTimeout).toBe(0);
    });

    it('should reject negative disposalTimeout', () => {
      expect(() => {
        Blac.setConfig({ disposalTimeout: -1 });
      }).toThrow('must be non-negative');
    });

    it('should reject invalid disposalTimeout type', () => {
      expect(() => {
        Blac.setConfig({ disposalTimeout: '100' as any });
      }).toThrow('must be a number');
    });

    it('should accept strictModeCompatibility boolean', () => {
      Blac.setConfig({ strictModeCompatibility: false });
      expect(Blac.config.strictModeCompatibility).toBe(false);
    });

    it('should reject invalid strictModeCompatibility type', () => {
      expect(() => {
        Blac.setConfig({ strictModeCompatibility: 'true' as any });
      }).toThrow('must be a boolean');
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
