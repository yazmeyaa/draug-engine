export class EventBuffer<T extends unknown> {
    private readBuf: T[] = [];
    private writeBuf: T[] = [];
    public write(event: T): void {
        this.writeBuf.push(event);
    };

    /**
     * Advances the buffer to the next frame.
     *
     * Performs a double-buffer flip:
     * - Promotes all events written during the previous frame (`writeBuf`)
     *   to be readable in the current frame (`readBuf`).
     * - Reuses the previous `readBuf` as the new `writeBuf` and clears it
     *   to collect events for the next frame.
     *
     * After calling this method:
     * - `get()` will return a stable snapshot of events produced in the previous frame.
     * - `add()` will write into an empty buffer for the current frame.
     *
     * Guarantees:
     * - No events written during the current frame are visible until the next `swap()`.
     * - Readers observe a consistent, immutable snapshot within a frame.
     *
     * Expected to be called exactly once per frame, before system execution.
    */
    public swap() {
        const tmp = this.readBuf;
        this.readBuf = this.writeBuf;
        this.writeBuf = tmp;
        this.writeBuf.length = 0;
    }

    public read(): ReadonlyArray<T> {
        return this.readBuf;
    };
};

type EventKey<T> = symbol & { __type?: T };

export function createEventKey<T>(description?: string): EventKey<T> {
    return Symbol(description) as EventKey<T>;
}

export class EventBus {
    private storage: Map<symbol, EventBuffer<any>> = new Map();
    public swapAll(): void {
        this.storage.forEach(s => s.swap());
    }

    public getBuffer<T>(key: EventKey<T>): EventBuffer<T> {
        let buf = this.storage.get(key);
        if (!buf) {
            buf = new EventBuffer<T>();
            this.storage.set(key, buf);
        }
        return buf;
    }
}
