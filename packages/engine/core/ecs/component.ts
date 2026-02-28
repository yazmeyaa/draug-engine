import { Bitmap } from "bitmap-index";
import { SparseSet } from "ts-sparse-set";
import { ObjectPool } from "../../../core/memory/pool";

export class ComponentStorage
    // Can store only pointer-type objects
    <T extends object> {
        private bits_: Bitmap;
        private set_: SparseSet<T>;
        private pool_: ObjectPool<T>;
        private id_: number = 0;

    constructor(cap = 1024, factory: () => T) {
        this.set_ = new SparseSet(cap);
        this.bits_ = new Bitmap(cap);
        this.pool_ = new ObjectPool(factory, cap);
    }

    public get id(): number {
        return this.id_;
    }

    public _internalSetId(id: number): number {
        return this.id_ = id;
    }

    public addComponent(id: number, initFn?: (obj: T) => T): T {
        const obj = this.pool_.acquire();
        initFn?.(obj);
        const value = this.set_.add(id, obj);
        this.bits_.set(id);
        return value;
    }

    public removeComponent(id: number): void {
        const obj = this.set_.get(id);
        if(!obj) return;
        this.bits_.remove(id);
        this.pool_.release(obj);
        this.set_.remove(id);
    }

    public getComponents(ids: number[]): T[] {
        const res: T[] = new Array(ids.length);
        let idx = 0;

        for(const id of ids) {
            const obj = this.set_.get(id);
            if(obj !== null) res[idx++] = obj;
        }
        res.length = idx;
        
        return res;
    }

    public writeComponentsToBuf(ids: ReadonlyArray<number>, out: T[]): number {
        let len = 0;
        for(const id of ids) {
            const obj = this.set_.get(id);
            if(obj !== null) out[len++] = obj;
        }
        return len;
    }

    public hasComponent(id: number): boolean {
        return this.bits_.contains(id);
    }
};

type RegisterComponentOptions<T extends object> = {
    factory?: () => T;
};
type ClassType<T> = new (...args: any[]) => T;
export class ComponentAlreadyRegisteredError extends Error {
    constructor(component: ClassType<any>) {
        super(`Component ${component.name} already registered!`)
    }
}

export class ComponentsManager {
    private readonly stores_ = new Map<ClassType<any>, ComponentStorage<any>>();
    private currId_ = 0;
    private nextId(): number {
        return ++this.currId_;
    }

    public registerComponent<T extends object>(component: ClassType<T>, opts: RegisterComponentOptions<T>): ComponentStorage<T> {
        if(this.stores_.has(component))
            throw new ComponentAlreadyRegisteredError(component)

        const defaultFactoryStorage = (...args: any[]) => new component(...args);
        const factory = opts.factory ?? defaultFactoryStorage;
        const store = new ComponentStorage(1024, factory)
        store._internalSetId(this.nextId());

        this.stores_.set(component, store);
        return store;
    }

    public getComponentStorage<T extends object>(component: ClassType<T>): ComponentStorage<T> | null {
        const store = this.stores_.get(component);
        if(store === undefined) return null;

        return store;
    } 
}