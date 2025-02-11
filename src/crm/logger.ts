export class Logger {
  logLevel: "info" | "warn" | "error";

  constructor(logLevel: "info" | "warn" | "error" = "info") {
    this.logLevel = logLevel;
  }

  public log(level: "info" | "warn" | "error", message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
  }

  info(message: string): void {
    if (this.logLevel === "info") {
      this.log("info", message);
    }
  }

  warn(message: string): void {
    if (this.logLevel === "info" || this.logLevel === "warn") {
      this.log("warn", message);
    }
  }

  error(message: string): void {
    this.log("error", message);
  }
}
