import { describe, expect, it, vi } from "vitest";
import { NoopLogger } from "../../logger";
import {
    getResourceMetadata,
    Resource,
    ResourcesManager,
} from "./resources";

@Resource({ name: "TestClock" })
class TestClock {
    tick = 0;
}

@Resource({ name: "TestConfig" })
class TestConfig {
    width = 800;
}

function createManager(): ResourcesManager {
    return new ResourcesManager(new NoopLogger());
}

describe("getResourceMetadata", () => {
    it("returns the name from the @Resource decorator", () => {
        expect(getResourceMetadata(TestClock)).toEqual({ name: "TestClock" });
    });

    it("throws when the class is not decorated with @Resource", () => {
        class NotAResource {}

        expect(() => getResourceMetadata(NotAResource)).toThrow(
            /Class NotAResource is not a Resource/,
        );
    });
});

describe("ResourcesManager", () => {
    it("stores and returns a resource via insert and get", () => {
        const manager = createManager();
        const clock = new TestClock();
        clock.tick = 42;

        manager.insert(TestClock, clock);

        expect(manager.get(TestClock)).toBe(clock);
        expect(manager.get(TestClock).tick).toBe(42);
    });

    it("returns the same value that insert received", () => {
        const manager = createManager();
        const config = new TestConfig();

        const returned = manager.insert(TestConfig, config);

        expect(returned).toBe(config);
    });

    it("overwrites an existing resource when insert is called again", () => {
        const manager = createManager();
        const first = new TestClock();
        first.tick = 1;
        const second = new TestClock();
        second.tick = 2;

        manager.insert(TestClock, first);
        manager.insert(TestClock, second);

        expect(manager.get(TestClock)).toBe(second);
        expect(manager.get(TestClock).tick).toBe(2);
    });

    it("throws when get is called for a resource that was never inserted", () => {
        const manager = createManager();

        expect(() => manager.get(TestClock)).toThrow(
            /Resource of class TestClock does not exist!/,
        );
    });

    it("throws when get is called after remove", () => {
        const manager = createManager();
        manager.insert(TestClock, new TestClock());
        manager.remove(TestClock);

        expect(() => manager.get(TestClock)).toThrow(
            /Resource of class TestClock does not exist!/,
        );
    });

    it("creates a resource via factory when getOrInsert finds none", () => {
        const manager = createManager();
        const factory = vi.fn(() => {
            const config = new TestConfig();
            config.width = 640;
            return config;
        });

        const value = manager.getOrInsert(TestConfig, factory);

        expect(factory).toHaveBeenCalledOnce();
        expect(value.width).toBe(640);
        expect(manager.get(TestConfig)).toBe(value);
    });

    it("returns the existing resource without calling the factory again", () => {
        const manager = createManager();
        const existing = manager.insert(TestConfig, new TestConfig());
        const factory = vi.fn(() => new TestConfig());

        const value = manager.getOrInsert(TestConfig, factory);

        expect(factory).not.toHaveBeenCalled();
        expect(value).toBe(existing);
    });

    it("allows remove to be called when the resource is already absent", () => {
        const manager = createManager();

        expect(() => manager.remove(TestClock)).not.toThrow();
    });
});
