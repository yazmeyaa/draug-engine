import type { IStorage } from "./types";

export class SingletonStorage<T extends object> implements IStorage<T> {
    private value: T | null = null;
    private entityId: number | null = null;
    constructor(private factory: () => T) { }

    public add(id: number, initFn?: ((obj: T) => T) | undefined): T {
        if (this.value !== null)
            throw new Error("Singleton already initiated");

        this.entityId = id;
        this.value = this.factory();
        initFn?.(this.value);
        return this.value;

    }
    public remove(id: number): void {
        if (!this.validateId(id))
            return;
        this.value = null;
        this.entityId = null;
    }
    public get(id: number): T | null {
        if (!this.validateId(id))
            return null;
        return this.value;
    }
    public tryGet(id: number): T {
        if (!this.validateId(id))
            throw new Error("[SingletoneStorage]: ID missmatch.");
        return this.value!;
    }
    public has(id: number): boolean {
        return this.validateId(id);
    }
    public size(): number {
        return this.value !== null ? 1 : 0;
    }
    public forEach(cb: (id: number) => void): void {
        if(this.entityId !== null) 
            cb(this.entityId);
    }
    private validateId(id: number): boolean {
        return this.entityId !== null && id === this.entityId;
    }
}