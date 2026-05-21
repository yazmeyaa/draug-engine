import { describe, expect, it } from "vitest";
import { ComponentStorage } from "./component-storage";

class TestComponent {
    value = 0;
}

describe("ComponentStorage", () => {
    const factory = () => new TestComponent();
    const cls = TestComponent;

    it("adds and retrieves a component", () => {
        const storage = new ComponentStorage(64, factory, cls);
        const c = storage.add(1, (o) => { o.value = 42; return o; });

        expect(c.value).toBe(42);
        expect(storage.get(1)?.value).toBe(42);
        expect(storage.tryGet(1).value).toBe(42);
        expect(storage.has(1)).toBe(true);
        expect(storage.size()).toBe(1);
    });

    it("throws on duplicate add", () => {
        const storage = new ComponentStorage(64, factory, cls);
        storage.add(1);
        expect(() => storage.add(1)).toThrow(/already has this component/);
    });

    it("tryGet throws when missing", () => {
        const storage = new ComponentStorage(64, factory, cls);
        expect(() => storage.tryGet(99)).toThrow(/non-existing item/);
        expect(storage.get(99)).toBeNull();
    });

    it("removes the last element", () => {
        const storage = new ComponentStorage(64, factory, cls);
        storage.add(1, (o) => { o.value = 1; return o; });
        storage.add(2, (o) => { o.value = 2; return o; });

        storage.remove(2);

        expect(storage.has(2)).toBe(false);
        expect(storage.size()).toBe(1);
        expect(storage.tryGet(1).value).toBe(1);
    });

    it("swap-and-pop preserves swapped element on middle remove", () => {
        const storage = new ComponentStorage(64, factory, cls);
        storage.add(1, (o) => { o.value = 1; return o; });
        storage.add(2, (o) => { o.value = 2; return o; });
        storage.add(3, (o) => { o.value = 3; return o; });

        storage.remove(1);

        expect(storage.has(1)).toBe(false);
        expect(storage.size()).toBe(2);
        expect(storage.tryGet(2).value).toBe(2);
        expect(storage.tryGet(3).value).toBe(3);
    });

    it("forEach visits all entities", () => {
        const storage = new ComponentStorage(64, factory, cls);
        storage.add(10);
        storage.add(20);
        storage.add(30);

        const visited: number[] = [];
        storage.forEach((id) => visited.push(id));

        expect(visited).toHaveLength(3);
        expect(new Set(visited)).toEqual(new Set([10, 20, 30]));
    });

    it("bitmap matches has after add/remove cycles", () => {
        const storage = new ComponentStorage(64, factory, cls);
        storage.add(5);
        storage.add(7);
        storage.remove(5);
        storage.add(9);

        const bm = storage.bitmap();
        expect(storage.has(5)).toBe(false);
        expect(storage.has(7)).toBe(true);
        expect(storage.has(9)).toBe(true);

        const ids: number[] = [];
        bm.range((id) => {ids.push(id); return true;});
        expect(new Set(ids)).toEqual(new Set([7, 9]));
    });

    it("writeComponentsToBuf gathers existing components", () => {
        const storage = new ComponentStorage(64, factory, cls);
        const a = storage.add(1, (o) => { o.value = 10; return o; });
        const b = storage.add(2, (o) => { o.value = 20; return o; });
        const out: TestComponent[] = [];

        const len = storage.writeComponentsToBuf([1, 99, 2], out);

        expect(len).toBe(2);
        expect(out[0]).toBe(a);
        expect(out[1]).toBe(b);
    });
});
