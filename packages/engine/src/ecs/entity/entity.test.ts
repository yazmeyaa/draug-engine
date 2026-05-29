import { describe, expect, it } from "vitest";
import { NoopLogger } from "../../logger";
import { Component } from "../components/utils";
import {
    EntitiesManager,
    EntityMaskNotFoundError,
    UnregisteredComponentStorageError,
} from "./entity";

@Component({ name: "TestPosition" })
class TestPosition {}

function createManager(): EntitiesManager {
    return new EntitiesManager(new NoopLogger());
}

describe("EntitiesManager", () => {
    it("assigns monotonically increasing ids when none are recycled", () => {
        const manager = createManager();

        expect(manager.create()).toBe(1);
        expect(manager.create()).toBe(2);
        expect(manager.create()).toBe(3);
    });

    it("reuses a destroyed entity id on the next create", () => {
        const manager = createManager();
        const id = manager.create();
        manager.create();

        manager.destroy(id);

        expect(manager.create()).toBe(id);
    });

    it("reuses the most recently destroyed id first", () => {
        const manager = createManager();
        const first = manager.create();
        const second = manager.create();

        manager.destroy(first);
        manager.destroy(second);

        expect(manager.create()).toBe(second);
        expect(manager.create()).toBe(first);
    });

    it("continues allocating new ids after the recycle pool is empty", () => {
        const manager = createManager();
        const recycled = manager.create();
        manager.destroy(recycled);
        manager.create();

        expect(manager.create()).toBe(2);
    });

    it("allows destroying an id that was never issued", () => {
        const manager = createManager();

        expect(() => manager.destroy(99)).not.toThrow();
    });
});

describe("EntityMaskNotFoundError", () => {
    it("includes the entity id in the message", () => {
        const error = new EntityMaskNotFoundError(42);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
            "Cannot find bitmask for entity [42]. Seems like it's not registered in the EntityManager.",
        );
    });
});

describe("UnregisteredComponentStorageError", () => {
    it("includes the component name in the message", () => {
        const error = new UnregisteredComponentStorageError(TestPosition);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
            "Cannot get storage for component TestPosition. Seems like it's not registered in world.",
        );
    });
});
