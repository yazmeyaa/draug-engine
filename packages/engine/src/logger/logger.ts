export enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}
export type LogMessage = () => string;

export interface Logger {
    debug(message: LogMessage): void;
    info(message: LogMessage): void;
    warn(message: LogMessage): void;
    error(message: LogMessage): void;
}

export class NoopLogger implements Logger {
    public debug(): void { }
    public info(): void { }
    public warn(): void { }
    public error(): void { }
}