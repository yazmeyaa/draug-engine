import { LogLevel, type Logger } from "@draug/engine";

export class HTMLLogger implements Logger {
    private readonly htmlUList: HTMLUListElement;
    constructor(target: HTMLElement) {
        const root = document.createElement("ul");
        this.htmlUList = root;
        target.appendChild(root);
    }
    public debug(message: () => string): void {
        const msg = this.formatMessage("DEBUG", message);
        this.pushLogToList(LogLevel.Debug, msg);
    }
    public info(message: () => string): void {
        const msg = this.formatMessage("INFO", message);
        this.pushLogToList(LogLevel.Info, msg);
    }
    public warn(message: () => string): void {
        const msg = this.formatMessage("WARN", message);
        this.pushLogToList(LogLevel.Warn, msg);
    }
    public error(message: () => string): void {
        const msg = this.formatMessage("ERROR", message);
        this.pushLogToList(LogLevel.Error, msg);
    }

    private formatMessage(prefix: string, msg: () => string): string {
        const now = new Date();
        return `[${prefix}] | ${now.toLocaleString()} | : ${msg()}`;
    }

    private logLevelToClassName(lvl: LogLevel): string {
        switch (lvl) {
            case LogLevel.Debug:
                return 'debug';
            case LogLevel.Info:
                return 'info';
            case LogLevel.Warn:
                return 'warn';
            case LogLevel.Error:
                return 'error';
            default:
                return 'unknown;'
        }
    }

    private pushLogToList(level: LogLevel, msg: string): void {
        const listItem = document.createElement('li');
        listItem.classList.add(`log-${this.logLevelToClassName(level)}`);
        const textElem = document.createElement('span');
        listItem.appendChild(textElem);
        textElem.innerText = msg;
        this.htmlUList.appendChild(listItem);
    }
};