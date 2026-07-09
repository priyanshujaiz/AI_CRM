export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG"
}

export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatContext(context?: string): string {
    return context ? ` [${context}]` : "";
  }

  /**
   * Log info messages for normal operations.
   */
  public static info(message: string, context?: string, meta?: any): void {
    const timestamp = this.getTimestamp();
    const ctx = this.formatContext(context);
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    console.log(`\x1b[36m[${timestamp}]\x1b[0m \x1b[32m[INFO]\x1b[0m${ctx}: ${message}${metaStr}`);
  }

  /**
   * Log warnings for retries, validations, or non-fatal anomalies.
   */
  public static warn(message: string, context?: string, error?: any): void {
    const timestamp = this.getTimestamp();
    const ctx = this.formatContext(context);
    const errStr = error ? ` | Details: ${error instanceof Error ? error.message : JSON.stringify(error)}` : "";
    console.warn(`\x1b[36m[${timestamp}]\x1b[0m \x1b[33m[WARN]\x1b[0m${ctx}: ${message}${errStr}`);
  }

  /**
   * Log fatal batch or application failures.
   */
  public static error(message: string, context?: string, error?: any): void {
    const timestamp = this.getTimestamp();
    const ctx = this.formatContext(context);
    const stack = error?.stack ? `\nStack trace:\n${error.stack}` : "";
    const errMsg = error ? ` | Error: ${error.message || JSON.stringify(error)}` : "";
    console.error(`\x1b[36m[${timestamp}]\x1b[0m \x1b[31m[ERROR]\x1b[0m${ctx}: ${message}${errMsg}${stack}`);
  }

  /**
   * Log detailed debug info (e.g. raw rows mapping).
   */
  public static debug(message: string, context?: string, meta?: any): void {
    // Only print debug logs if DEBUG environment flag is enabled
    if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
      const timestamp = this.getTimestamp();
      const ctx = this.formatContext(context);
      const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
      console.log(`\x1b[36m[${timestamp}]\x1b[0m \x1b[35m[DEBUG]\x1b[0m${ctx}: ${message}${metaStr}`);
    }
  }
}
