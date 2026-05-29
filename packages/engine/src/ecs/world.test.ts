import { describe, expect, it } from "vitest";
import { NoopLogger } from "../logger";
import { Clock, type TimeSource } from "../runtime/clock";
import { Component } from "./components/utils";
import { entry } from "./command/command";
import { System, SystemBase } from "./system/system";
import { World } from "./world";

@Component({ name: "WorldTestPosition" })
class WorldTestPosition {
    x = 0;
}

@Component({ name: "WorldTestVelocity" })
class WorldTestVelocity {
    y = 0;
}

function createWorld(): World {
    const world = new World({ logger: new NoopLogger() });
    world.components.register(WorldTestPosition);
    world.components.register(WorldTestVelocity);
    return world;
}

function createClock(nowMs = 0): Clock {
    const timeSource: TimeSource = { now: () => nowMs };
    const clock = new Clock(timeSource);
    clock.tick();
    return clock;
}

describe("World", () => {
    describe("createEntity", () => {
        it("assigns monotonically increasing ids when none are recycled", () => {
            const world = createWorld();

            expect(world.createEntity()).toBe(1);
            expect(world.createEntity()).toBe(2);
            expect(world.createEntity()).toBe(3);
        });

        it("reuses a destroyed entity id on the next create", () => {
            const world = createWorld();
            const id = world.createEntity();
            world.createEntity();

            world.destroyEntity(id);

            expect(world.createEntity()).toBe(id);
        });

        it("registers each new entity in getActiveEntityIds", () => {
            const world = createWorld();

            const first = world.createEntity();
            const second = world.createEntity();

            expect(world.getActiveEntityIds()).toEqual([first, second]);
        });
    });

    describe("getActiveEntityIds", () => {
        it("returns an empty list for a new world", () => {
            const world = createWorld();

            expect(world.getActiveEntityIds()).toEqual([]);
        });

        it("returns ids in ascending sorted order", () => {
            const world = createWorld();
            const third = world.createEntity();
            const first = world.createEntity();
            const second = world.createEntity();

            expect(world.getActiveEntityIds()).toEqual([first, second, third].sort((a, b) => a - b));
        });
    });

    describe("destroyEntity", () => {
        it("removes the entity from getActiveEntityIds", () => {
            const world = createWorld();
            const id = world.createEntity();
            world.createEntity();

            world.destroyEntity(id);

            expect(world.getActiveEntityIds()).not.toContain(id);
            expect(world.getActiveEntityIds()).toHaveLength(1);
        });

        it("removes every attached component from storage", () => {
            const world = createWorld();
            const id = world.createEntity();
            world.addComponent(id, WorldTestPosition, (p) => {
                p.x = 1;
            });
            world.addComponent(id, WorldTestVelocity, (v) => {
                v.y = 2;
            });

            world.destroyEntity(id);

            expect(world.components.getStorage(WorldTestPosition).has(id)).toBe(false);
            expect(world.components.getStorage(WorldTestVelocity).has(id)).toBe(false);
        });

        it("excludes the entity from matching queries", () => {
            const world = createWorld();
            const id = world.createEntity();
            world.addComponent(id, WorldTestPosition);

            world.destroyEntity(id);

            expect(world.query({ include: [WorldTestPosition] })).toEqual([]);
        });
    });

    describe("addComponent", () => {
        it("runs initFn and returns the stored component", () => {
            const world = createWorld();
            const id = world.createEntity();

            const position = world.addComponent(id, WorldTestPosition, (p) => {
                p.x = 42;
            });

            expect(position.x).toBe(42);
            expect(world.components.getStorage(WorldTestPosition).get(id)?.x).toBe(42);
        });

        it("includes the entity in matching queries", () => {
            const world = createWorld();
            const id = world.createEntity();

            world.addComponent(id, WorldTestPosition);

            expect(world.query({ include: [WorldTestPosition] })).toEqual([id]);
        });
    });

    describe("removeComponent", () => {
        it("excludes the entity from matching queries while keeping it active", () => {
            const world = createWorld();
            const id = world.createEntity();
            world.addComponent(id, WorldTestPosition);

            world.removeComponent(id, WorldTestPosition);

            expect(world.query({ include: [WorldTestPosition] })).toEqual([]);
            expect(world.getActiveEntityIds()).toContain(id);
            expect(world.components.getStorage(WorldTestPosition).has(id)).toBe(false);
        });

        it("allows removing a component that was never added", () => {
            const world = createWorld();
            const id = world.createEntity();

            expect(() => world.removeComponent(id, WorldTestPosition)).not.toThrow();
        });
    });

    describe("update", () => {
        it("starts with updatesCount at zero", () => {
            const world = createWorld();

            expect(world.updatesCount).toBe(0);
        });

        it("increments updatesCount on each call", () => {
            const world = createWorld();
            const clock = createClock();

            world.update(clock);
            world.update(clock);

            expect(world.updatesCount).toBe(2);
        });

        it("runs systems before flushing deferred commands", () => {
            const world = createWorld();
            const order: string[] = [];

            @System({ name: "WorldUpdateOrder", query: {} })
            class OrderSystem extends SystemBase {
                public compute(): void {
                    order.push("system");
                }
            }

            world.systems.register(new OrderSystem());
            world.commands.add(() => {
                order.push("command");
            });

            world.update(createClock());

            expect(order).toEqual(["system", "command"]);
        });

        it("flushes deferred commands at the end of update", () => {
            const world = createWorld();
            const clock = createClock();

            const id = world.commands.createEntity(
                entry(WorldTestPosition, (p) => {
                    p.x = 9;
                }),
            );

            expect(world.components.getStorage(WorldTestPosition).has(id)).toBe(false);

            world.update(clock);

            expect(world.components.getStorage(WorldTestPosition).get(id)?.x).toBe(9);
        });
    });

    describe("build", () => {
        it("completes without throwing when no plugins are installed", () => {
            const world = createWorld();

            expect(() => world.build()).not.toThrow();
        });
    });
});
