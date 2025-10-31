import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureLogger, debug, info, warn, error, LogLevel } from './Logger';

describe('Logger', () => {
  beforeEach(() => {
    // Reset logger config before each test
    configureLogger({
      enabled: false,
      level: LogLevel.INFO,
      output: (entry) => console.log(JSON.stringify(entry)),
    });
  });

  describe('configuration', () => {
    it('should be disabled by default', () => {
      const output = vi.fn();
      configureLogger({ output });

      info('test', 'message');

      expect(output).not.toHaveBeenCalled();
    });

    it('should respect enabled flag', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.INFO,
        output,
      });

      info('test', 'message');

      expect(output).toHaveBeenCalledOnce();
    });

    it('should allow partial configuration updates', () => {
      const output = vi.fn();

      configureLogger({ enabled: true });
      configureLogger({ output });

      info('test', 'message');

      expect(output).toHaveBeenCalledOnce();
    });
  });

  describe('log levels', () => {
    it('should filter logs based on level - ERROR only', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.ERROR,
        output,
      });

      error('test', 'error');
      warn('test', 'warn');
      info('test', 'info');
      debug('test', 'debug');

      expect(output).toHaveBeenCalledOnce();
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'ERROR' }),
      );
    });

    it('should filter logs based on level - WARN and above', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.WARN,
        output,
      });

      error('test', 'error');
      warn('test', 'warn');
      info('test', 'info');
      debug('test', 'debug');

      expect(output).toHaveBeenCalledTimes(2);
      expect(output).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ level: 'ERROR' }),
      );
      expect(output).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ level: 'WARN' }),
      );
    });

    it('should filter logs based on level - INFO and above', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.INFO,
        output,
      });

      error('test', 'error');
      warn('test', 'warn');
      info('test', 'info');
      debug('test', 'debug');

      expect(output).toHaveBeenCalledTimes(3);
    });

    it('should log all levels at DEBUG', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      error('test', 'error');
      warn('test', 'warn');
      info('test', 'info');
      debug('test', 'debug');

      expect(output).toHaveBeenCalledTimes(4);
    });
  });

  describe('log entry structure', () => {
    it('should include required fields', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      debug('TestContext', 'test message');

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'DEBUG',
          context: 'TestContext',
          message: 'test message',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should include data when provided', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      const testData = { foo: 'bar', count: 42 };
      debug('TestContext', 'test message', testData);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          data: testData,
        }),
      );
    });

    it('should not include data field when data is undefined', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      debug('TestContext', 'test message');

      const call = output.mock.calls[0][0];
      expect(call).not.toHaveProperty('data');
    });
  });

  describe('data serialization', () => {
    it('should serialize simple objects', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      debug('test', 'message', { foo: 'bar' });

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { foo: 'bar' },
        }),
      );
    });

    it('should serialize nested objects', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      const data = {
        user: {
          name: 'John',
          settings: { theme: 'dark' },
        },
      };

      debug('test', 'message', data);

      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          data,
        }),
      );
    });

    it('should handle serialization failures gracefully', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      // Create circular reference
      const circular: any = { a: 1 };
      circular.self = circular;

      // Should not throw
      expect(() => {
        debug('test', 'message', circular);
      }).not.toThrow();

      // Should have called output (with fallback serialization)
      expect(output).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('should not crash when output handler throws', () => {
      const output = vi.fn(() => {
        throw new Error('Output failed');
      });

      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      // Should not throw - errors are caught internally
      expect(() => {
        debug('test', 'message');
      }).not.toThrow();
    });

    it('should not crash on invalid data', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        output,
      });

      // Should handle various edge cases without throwing
      expect(() => {
        debug('test', 'message', undefined);
        debug('test', 'message', null);
        debug('test', 'message', Symbol('test'));
        debug('test', 'message', () => {});
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should not call output when logging is disabled', () => {
      const output = vi.fn();
      configureLogger({
        enabled: false,
        level: LogLevel.DEBUG,
        output,
      });

      debug('test', 'message', { expensive: 'data' });

      expect(output).not.toHaveBeenCalled();
    });

    it('should not call output when level is too low', () => {
      const output = vi.fn();
      configureLogger({
        enabled: true,
        level: LogLevel.ERROR,
        output,
      });

      debug('test', 'message', { expensive: 'data' });

      expect(output).not.toHaveBeenCalled();
    });
  });
});
