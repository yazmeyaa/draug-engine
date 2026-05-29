import { ObjectPool } from "../../core/memory/pool";
import { Bitmap } from "bitmap-index";
import { ECS_DEFAULTS } from "../constant";
import type { ClassType } from "../../types/class";

export class ComponentStorage
    // Only pointer-types.
    <T extends object> {
    private bits_: Bitmap;
    private data_: T[] = [];
    private entityIds_: number[] = [];
    private indexMap_: Map<number, number> = new Map();
    private pool_: ObjectPool<T>;
    private id_: number = 0;
    private size_: number = 0;
    private cls: ClassType<T>

    /**
     * @param cap bitmap capacity (max entity id that can be represented).
     * @param factory component instance factory.
     * @param cls component class for diagnostics.
     */
    constructor(cap = ECS_DEFAULTS.MAX_ENTITY_COUNT, factory: () => T, cls: ClassType<T>) {
        this.bits_ = new Bitmap(cap);
        this.pool_ = new ObjectPool(factory, 0);
        this.cls = cls;
    }
    /** Returns bitmap of entity IDs that currently have this component. */
    public bitmap(): Bitmap {
        return this.bits_;
    }

    /** Internal numeric component storage id. */
    public get id(): number {
        return this.id_;
    }

    /** @internal Assigned by {@link ComponentsManager}. */
    public _internalSetId(id: number): number {
        return this.id_ = id;
    }

    /**
     * Adds component for an entity.
     *
     * @throws Error if entity already has this component.
     */
    public add(id: number, initFn?: (obj: T) => T): T {
        if (this.indexMap_.has(id)) {
            throw new Error(`[ComponentStorage "${this.cls.name}"]: Entity ${id} already has this component`);
        }

        const obj = this.pool_.acquire();
        initFn?.(obj);

        const index = this.data_.length;
        this.data_.push(obj);
        this.entityIds_.push(id);
        this.indexMap_.set(id, index);

        this.bits_.set(id);
        this.size_++;

        return obj;
    }

    /** Removes component from an entity. No-op if absent. */
    public remove(id: number): void {
        const index = this.indexMap_.get(id);
        if (index === undefined) return;

        this.bits_.remove(id);

        const lastIndex = this.data_.length - 1;
        const lastEntityId = this.entityIds_[lastIndex]!;
        const removedObj = this.data_[index]!;

        if (index !== lastIndex) {
            this.data_[index] = this.data_[lastIndex]!;
            this.entityIds_[index] = lastEntityId;
            this.indexMap_.set(lastEntityId, index);
        }

        this.data_.pop();
        this.entityIds_.pop();
        this.indexMap_.delete(id);

        this.pool_.release(removedObj);
        this.size_--;
    }

    /** Gets component by entity id or `null` if absent. */
    public get(id: number): T | null {
        const index = this.indexMap_.get(id);
        return index !== undefined ? this.data_[index]! : null;
    }

    /**
     * Gets component by entity id.
     *
     * @throws Error when component is absent for the entity.
     */
    public tryGet(id: number): T {
        const index = this.indexMap_.get(id);
        if (index === undefined)
            throw new Error(`[ComponentStorage "${this.cls.name}"]: Requesting non-existing item with ID ${id}.`);
        return this.data_[index]!;
    }

    /**
     * Writes components for provided entity ids into `out`.
     * Returns number of written elements.
     */
    public writeComponentsToBuf(ids: ReadonlyArray<number>, out: T[]): number {
        let len = 0;
        for (const id of ids) {
            const index = this.indexMap_.get(id);
            if (index !== undefined) out[len++] = this.data_[index]!;
        }
        return len;
    }

    /** Checks whether entity currently has this component. */
    public has(id: number): boolean {
        return this.bits_.contains(id);
    }


    /** Current number of stored components. */
    public size(): number {
        return this.size_;
    }

    /** Iterates over entity IDs that own this component. */
    public forEach(cb: (id: number) => void): void {
        for (const id of this.entityIds_) {
            cb(id);
        }
    }
};
