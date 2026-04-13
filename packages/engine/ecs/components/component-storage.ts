import { ObjectPool } from "@amber-game/core/memory/pool";
import { Bitmap } from "bitmap-index";
import { SparseSet } from "ts-sparse-set";
import { ECS_DEFAULTS } from "../constant";
import type { IStorage } from "./types";

export class ComponentStorage
    // Only pointer-types.
    <T extends object> implements IStorage<T> {
    private bits_: Bitmap;
    private set_: SparseSet<T>;
    private pool_: ObjectPool<T>;
    private id_: number = 0;

    constructor(cap = ECS_DEFAULTS.MAX_ENTITY_COUNT, factory: () => T) {
        this.set_ = new SparseSet(cap);
        this.bits_ = new Bitmap(cap);
        this.pool_ = new ObjectPool(factory, cap);
    }
    public bitmap(): Bitmap {
        return this.bits_;
    }

    public get id(): number {
        return this.id_;
    }

    public _internalSetId(id: number): number {
        return this.id_ = id;
    }

    public add(id: number, initFn?: (obj: T) => T): T {
        const obj = this.pool_.acquire();
        initFn?.(obj);
        const value = this.set_.add(id, obj);
        this.bits_.set(id);
        return value;
    }

    public remove(id: number): void {
        const obj = this.set_.get(id);
        if (!obj) return;
        this.bits_.remove(id);
        this.pool_.release(obj);
        this.set_.remove(id);
    }

    public get(id: number): T | null {
        return this.set_.get(id);
    }

    public tryGet(id: number): T {
        const x = this.set_.get(id);
        if (!x)
            throw new Error(`Requesting non-existing item with ID ${id}.`);
        return x;
    }

    public writeComponentsToBuf(ids: ReadonlyArray<number>, out: T[]): number {
        let len = 0;
        for (const id of ids) {
            const obj = this.set_.get(id);
            if (obj !== null) out[len++] = obj;
        }
        return len;
    }

    public has(id: number): boolean {
        return this.bits_.contains(id);
    }

    public entityIds(): number[] {
        return Array.from(this.bits_);
    }

    public size(): number {
        return this.bits_.count();
    }

    public forEach(cb: (id: number) => void): void {
        this.bits_.range(x => cb(x));
    }
};