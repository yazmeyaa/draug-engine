export class ObjectPool<T extends object> {
    private pool_: T[];
    private factory_: () => T;
    private cursor_: number;

    constructor(factory: () => T, initialSize = 0) {
        this.pool_ = new Array(initialSize);
        this.factory_ = factory;
        this.cursor_ = initialSize - 1;
    }

    acquire(): T {
        if (this.cursor_ >= 0) {
            return this.pool_[this.cursor_--]!;
        }
        return this.factory_();
    }

    release(obj: T) {
        this.pool_[++this.cursor_] = obj;
    }

    private grow() {
        const oldSize = this.pool_.length;
        const newSize = oldSize * 2;
        for (let i = oldSize; i < newSize; i++) this.pool_[i] = this.factory_();
        this.cursor_ = newSize - 1;
        this.pool_.length = newSize;
    }
}
