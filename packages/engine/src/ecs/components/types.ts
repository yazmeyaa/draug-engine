import type { ClassType, ComponentType } from "../../types/class";
import type { Bitmap } from "bitmap-index";

export type { ClassType, ComponentType };
export interface IStorage <T extends object> {
    add(id: number, initFn?: (obj: T) => T): T;
    remove(id: number): void;
    get(id: number): T | null;
    tryGet(id: number): T;
    has(id: number): boolean
    size(): number;
    forEach(cb: (id: number) => void): void;
    bitmap(): Bitmap;
}; 