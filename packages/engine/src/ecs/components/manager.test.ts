import { describe, expect, it } from "vitest";
import { NoopLogger } from "../../logger";
import { UnregisteredComponentStorageError } from "../entity";
import {
    ComponentAlreadyRegisteredError,
    ComponentsManager,
} from "./manager";
import { Component, getComponentId } from "./utils";

@Component({ name: "TestPosition" })
class TestPosition {
    x = 0;
}

@Component({ name: "TestVelocity" })
class TestVelocity {
    y = 0;
}

@Component({ name: "TestHealth" })
class TestHealth {
    value = 0;
}

function createManager(): ComponentsManager {
    return new ComponentsManager(new NoopLogger());
}

describe("ComponentsManager", () => {
    it("returns a storage that can hold components for an entity", () => {
        const manager = createManager();
        const storage = manager.register(TestPosition);

        const position = storage.add(1, (p) => {
            p.x = 10;
            return p;
        });

        expect(position.x).toBe(10);
        expect(storage.get(1)).toBe(position);
    });

    it("returns the same storage instance when register is called twice", () => {
        const manager = createManager();
        const first = manager.register(TestPosition);
        const second = manager.register(TestPosition);

        expect(second).toBe(first);
    });

    it("assigns monotonically increasing internal ids to each new storage", () => {
        const manager = createManager();

        const position = manager.register(TestPosition);
        const velocity = manager.register(TestVelocity);
        const health = manager.register(TestHealth);

        expect(position.id).toBe(1);
        expect(velocity.id).toBe(2);
        expect(health.id).toBe(3);
    });

    it("uses a custom factory when one is provided", () => {
        const manager = createManager();
        const storage = manager.register(TestHealth, {
            factory: () => ({ value: 99 }),
        });

        expect(storage.add(1).value).toBe(99);
    });

    it("returns the registered storage from getStorage", () => {
        const manager = createManager();
        const registered = manager.register(TestPosition);

        expect(manager.getStorage(TestPosition)).toBe(registered);
    });

    it("throws UnregisteredComponentStorageError for an unregistered component", () => {
        const manager = createManager();

        expect(() => manager.getStorage(TestPosition)).toThrow(
            UnregisteredComponentStorageError,
        );
        expect(() => manager.getStorage(TestPosition)).toThrow(
            /Cannot get storage for component TestPosition/,
        );
    });

    it("delegates getComponentId to the decorator registry", () => {
        const manager = createManager();

        expect(manager.getComponentId(TestPosition)).toBe(
            getComponentId(TestPosition),
        );
    });

    it("throws when getComponentId is called on a class without @Component", () => {
        class NotAComponent {}

        const manager = createManager();

        expect(() => manager.getComponentId(NotAComponent)).toThrow(
            /Component not registered: NotAComponent/,
        );
    });
});

describe("ComponentAlreadyRegisteredError", () => {
    it("includes the component name in the message", () => {
        const error = new ComponentAlreadyRegisteredError(TestPosition);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Component TestPosition already registered!");
    });
});
