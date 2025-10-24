enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: string;
  context: string;
  message: string;
  data?: any;
  timestamp: number;
}

class BlacLogger {
  private static config = {
    enabled: false, // Off by default
    level: LogLevel.INFO,
    output: (entry: LogEntry) => console.log(JSON.stringify(entry)),
  };

  static configure(opts: {
    enabled?: boolean;
    level?: LogLevel;
    output?: (entry: LogEntry) => void;
  }): void {
    Object.assign(this.config, opts);
  }

  static debug(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.DEBUG) return;
    this.log('DEBUG', context, message, data);
  }

  static info(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.INFO) return;
    this.log('INFO', context, message, data);
  }

  static warn(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.WARN) return;
    this.log('WARN', context, message, data);
  }

  static error(context: string, message: string, data?: any): void {
    if (!this.config.enabled || this.config.level < LogLevel.ERROR) return;
    this.log('ERROR', context, message, data);
  }

  private static log(
    level: string,
    context: string,
    message: string,
    data?: any,
  ): void {
    try {
      const entry: LogEntry = {
        level,
        context,
        message,
        timestamp: Date.now(),
        ...(data !== undefined && { data: this.serialize(data) }),
      };
      this.config.output(entry);
    } catch (e) {
      // Fallback: never let logging crash the app
      console.error('[BlacLogger] Error logging:', e);
    }
  }

  private static serialize(data: any): any {
    try {
      // Simple serialization - if it fails, we'll catch it
      return JSON.parse(JSON.stringify(data));
    } catch {
      // Fallback to toString
      return String(data);
    }
  }
}

export { BlacLogger, LogLevel };
