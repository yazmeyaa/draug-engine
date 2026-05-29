/** Supported log levels for engine integrations. */
export enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}
/** Lazy log message producer to avoid unnecessary string allocations. */
export type LogMessage = () => string;

/** Minimal logger contract used by managers/systems. */
export interface Logger {
    debug(message: LogMessage): void;
    info(message: LogMessage): void;
    warn(message: LogMessage): void;
    error(message: LogMessage): void;
}

/** No-op logger used as the default in non-debug setups. */
export class NoopLogger implements Logger {
    public debug(): void { }
    public info(): void { }
    public warn(): void { }
    public error(): void { }
}