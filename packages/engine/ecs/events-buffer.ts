export class EventBuffer<T extends unknown> {
    private readBuf: T[] = [];
    private writeBuf: T[] = [];
    public write(event: T): void {
        this.readBuf.push(event);
    };

    public swap() {
        const tmp = this.readBuf;
        this.readBuf = this.writeBuf; 
        this.writeBuf = tmp;          
        this.writeBuf.length = 0;     
    }

    // ReadonlyArray<T> becase of i dont want to copy array to guarantee immutability of data.
    // Because of that method returns an Readonly array. It's not readonly in runtime, but compile-
    // time Typescript may garantee that this data will not mutate.
    // Main flow of Event Buffer is:
    // 1. Some systems can WRITE events to bus
    // 2. Some systems can READ events.
    // 3. Systems cant mutate events in buffer. 
    public get(): ReadonlyArray<T> {
        return this.readBuf;
    };
    public clear(): void {
        this.readBuf.length = 0;
    };
};


type EventTypeID = string | symbol;
export class EventBus {
    private storage: Map<EventTypeID, EventBuffer<unknown>> = new Map();
    public clearAll(): void {
        this.storage.forEach(s => s.clear());
    }

    public getBuffer<T extends unknown>(id: EventTypeID): EventBuffer<T> {
        if (this.storage.has(id)) {
            return this.storage.get(id) as EventBuffer<T>;
        }
        const buf = new EventBuffer<T>();
        this.storage.set(id, buf);
        return buf;
    }
}