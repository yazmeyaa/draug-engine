import { describe, expect, it, vi } from "vitest";
import { NoopLogger } from "../../logger";
import { Component } from "../components/utils";
import { World } from "../world";
import { entry } from "./command";

@Component({ name: "CmdTestPosition" })
class CmdTestPosition {
    x = 0;
}

@Component({ name: "CmdTestVelocity" })
class CmdTestVelocity {
    y = 0;
}

function createWorld(): World {
    const world = new World({ logger: new NoopLogger() });
    world.components.register(CmdTestPosition);
    world.components.register(CmdTestVelocity);
    return world;
}

describe("entry", () => {
    it("returns the component type and init function as a tuple", () => {
        const init = vi.fn((p: CmdTestPosition) => {
            p.x = 7;
        });

        const [component, initFn] = entry(CmdTestPosition, init);

        expect(component).toBe(CmdTestPosition);
        const position = new CmdTestPosition();
        initFn(position);
        expect(init).toHaveBeenCalledWith(position);
        expect(position.x).toBe(7);
    });

    it("uses a no-op init when none is provided", () => {
        const [, initFn] = entry(CmdTestPosition);
        const position = new CmdTestPosition();
        position.x = 3;

        initFn(position);

        expect(position.x).toBe(3);
    });
});

describe("Commands", () => {
    it("runs queued commands against the world on flush", () => {
        const world = createWorld();
        const { commands } = world;
        const effect = vi.fn();

        commands.add(() => {
            effect();
        });
        commands.flush(world);

        expect(effect).toHaveBeenCalledOnce();
    });

    it("executes queued commands in insertion order", () => {
        const world = createWorld();
        const { commands } = world;
        const order: number[] = [];

        commands.add(() => order.push(1));
        commands.add(() => order.push(2));
        commands.add(() => order.push(3));
        commands.flush(world);

        expect(order).toEqual([1, 2, 3]);
    });

    it("clears the queue after flush so a second flush runs nothing", () => {
        const world = createWorld();
        const { commands } = world;
        const effect = vi.fn();

        commands.add(effect);
        commands.flush(world);
        commands.flush(world);

        expect(effect).toHaveBeenCalledOnce();
    });

    it("returns an entity id from createEntity before components are applied", () => {
        const world = createWorld();
        const { commands } = world;
        const positionStorage = world.components.getStorage(CmdTestPosition);

        const id = commands.createEntity(
            entry(CmdTestPosition, (p) => {
                p.x = 10;
            }),
        );

        expect(world.getActiveEntityIds()).toContain(id);
        expect(positionStorage.has(id)).toBe(false);

        commands.flush(world);

        expect(positionStorage.get(id)?.x).toBe(10);
    });

    it("applies multiple component entries when the queue is flushed", () => {
        const world = createWorld();
        const { commands } = world;
        const positionStorage = world.components.getStorage(CmdTestPosition);
        const velocityStorage = world.components.getStorage(CmdTestVelocity);

        const id = commands.createEntity(
            entry(CmdTestPosition, (p) => {
                p.x = 1;
            }),
            entry(CmdTestVelocity, (v) => {
                v.y = 2;
            }),
        );
        commands.flush(world);

        expect(positionStorage.get(id)?.x).toBe(1);
        expect(velocityStorage.get(id)?.y).toBe(2);
    });

    it("creates an entity without components when createEntity has no entries", () => {
        const world = createWorld();
        const { commands } = world;
        const positionStorage = world.components.getStorage(CmdTestPosition);

        const id = commands.createEntity();
        commands.flush(world);

        expect(world.getActiveEntityIds()).toEqual([id]);
        expect(positionStorage.has(id)).toBe(false);
    });

    it("defers destroyEntity until flush", () => {
        const world = createWorld();
        const id = world.createEntity();

        world.commands.destroyEntity(id);
        expect(world.getActiveEntityIds()).toContain(id);

        world.commands.flush(world);

        expect(world.getActiveEntityIds()).not.toContain(id);
    });

    it("processes create and destroy commands in queue order within one flush", () => {
        const world = createWorld();
        const { commands } = world;

        const id = commands.createEntity(
            entry(CmdTestPosition, (p) => {
                p.x = 5;
            }),
        );
        commands.destroyEntity(id);
        commands.flush(world);

        expect(world.getActiveEntityIds()).not.toContain(id);
        expect(world.components.getStorage(CmdTestPosition).has(id)).toBe(false);
    });

    it("assigns distinct entity ids for multiple deferred creates", () => {
        const world = createWorld();
        const { commands } = world;

        const first = commands.createEntity(entry(CmdTestPosition));
        const second = commands.createEntity(entry(CmdTestPosition));
        commands.flush(world);

        expect(first).not.toBe(second);
        expect(world.getActiveEntityIds()).toEqual([first, second].sort((a, b) => a - b));
    });
});
