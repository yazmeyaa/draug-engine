export class ObjectPool<T extends object> {
    private pool: T[];
    private factory: () => T;
    private cursor: number;

    constructor(factory: () => T, initialSize = 1024) {
        this.pool = new Array(initialSize);
        for(let i = 0; i < initialSize; i++) {
            this.pool[i] = factory();
        }
        this.factory = factory;
        this.cursor = initialSize - 1;
    }

    acquire(): T {
        if (this.cursor < 0) this.grow();
        return this.pool[this.cursor--]!;
    }

    release(obj: T) {
        this.pool[++this.cursor] = obj;
    }

    private grow() {
        const oldSize = this.pool.length;
        const newSize = oldSize * 2;
        for (let i = oldSize; i < newSize; i++) this.pool[i] = this.factory();
        this.cursor = newSize - 1;
        this.pool.length = newSize;
    }
}