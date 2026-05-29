import { describe, expect, it } from "vitest";
import {
    createEventKey,
    EventBuffer,
    EventBus,
} from "./events-buffer";

describe("EventBuffer", () => {
    it("returns an empty read snapshot before any swap", () => {
        const buffer = new EventBuffer<number>();

        expect(buffer.read()).toEqual([]);
        expect(buffer.size()).toBe(0);
    });

    it("does not expose written events until swap", () => {
        const buffer = new EventBuffer<string>();

        buffer.write("a");
        buffer.write("b");

        expect(buffer.read()).toEqual([]);
        expect(buffer.size()).toBe(0);
    });

    it("promotes written events to read on swap in insertion order", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.write(2);
        buffer.write(3);
        buffer.swap();

        expect(buffer.read()).toEqual([1, 2, 3]);
        expect(buffer.size()).toBe(3);
    });

    it("isolates the current frame from the previous read snapshot after swap", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.swap();
        buffer.write(2);

        expect(buffer.read()).toEqual([1]);
        expect(buffer.size()).toBe(1);
    });

    it("clears the write side on swap so only new writes appear in the next frame", () => {
        const buffer = new EventBuffer<string>();

        buffer.write("frame-1");
        buffer.swap();
        buffer.write("frame-2");
        buffer.swap();

        expect(buffer.read()).toEqual(["frame-2"]);
    });

    it("returns the same read snapshot reference within a frame", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.swap();

        const first = buffer.read();
        const second = buffer.read();

        expect(first).toBe(second);
    });

    it("exposes only the latest swapped-in frame via read", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.swap();
        expect(buffer.read()).toEqual([1]);

        buffer.write(2);
        buffer.swap();

        expect(buffer.read()).toEqual([2]);
    });

    it("invalidates a held read snapshot after the next swap", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.swap();
        const previousFrame = buffer.read();

        buffer.write(2);
        buffer.swap();

        expect(previousFrame).toEqual([]);
        expect(buffer.read()).toEqual([2]);
    });

    it("reports zero size after swap when nothing was written in the previous frame", () => {
        const buffer = new EventBuffer<number>();

        buffer.write(1);
        buffer.swap();
        buffer.swap();

        expect(buffer.read()).toEqual([]);
        expect(buffer.size()).toBe(0);
    });
});

describe("createEventKey", () => {
    it("returns a unique symbol for each call", () => {
        const first = createEventKey<number>();
        const second = createEventKey<number>();

        expect(first).not.toBe(second);
        expect(typeof first).toBe("symbol");
    });

    it("uses the optional description as the symbol description", () => {
        const key = createEventKey<{ id: number }>("damage-dealt");

        expect(String(key)).toBe("Symbol(damage-dealt)");
    });
});

describe("EventBus", () => {
    it("returns the same buffer instance for a given key", () => {
        const bus = new EventBus();
        const key = createEventKey<string>();

        const first = bus.getBuffer(key);
        const second = bus.getBuffer(key);

        expect(first).toBe(second);
    });

    it("returns distinct buffers for different keys", () => {
        const bus = new EventBus();
        const damage = createEventKey<number>();
        const heal = createEventKey<number>();

        expect(bus.getBuffer(damage)).not.toBe(bus.getBuffer(heal));
    });

    it("swapAll promotes pending events in every registered buffer", () => {
        const bus = new EventBus();
        const damage = createEventKey<number>();
        const heal = createEventKey<number>();

        bus.getBuffer(damage).write(10);
        bus.getBuffer(heal).write(5);
        bus.swapAll();

        expect(bus.getBuffer(damage).read()).toEqual([10]);
        expect(bus.getBuffer(heal).read()).toEqual([5]);
    });

    it("swapAll does not affect buffers that were never written to", () => {
        const bus = new EventBus();
        const unused = createEventKey<void>();

        bus.swapAll();

        expect(bus.getBuffer(unused).read()).toEqual([]);
        expect(bus.getBuffer(unused).size()).toBe(0);
    });

    it("keeps event streams isolated per key across swaps", () => {
        const bus = new EventBus();
        const a = createEventKey<string>();
        const b = createEventKey<string>();

        bus.getBuffer(a).write("only-a");
        bus.getBuffer(b).write("only-b");
        bus.swapAll();

        expect(bus.getBuffer(a).read()).toEqual(["only-a"]);
        expect(bus.getBuffer(b).read()).toEqual(["only-b"]);
    });
});
