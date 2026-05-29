import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrDAGCycleDetected } from "../../core/graph/dag";
import { NoopLogger } from "../../logger";
import type { Time } from "../../runtime/clock";
import { Component } from "../components/utils";
import { World } from "../world";
import {
    ErrMissingSystemMetadata,
    ErrNotASystem,
    getSystemMetadata,
    isSystem,
    System,
    SystemBase,
    SystemPhase,
    type SystemComputeContext,
    type SystemCtor,
    type SystemInitContext,
} from "./system";

const FRAME_TIME: Time = { delta: 0.016, elapsed: 1 };

@Component({ name: "SystemTestPosition" })
class SystemTestPosition {}

@Component({ name: "SystemTestVelocity" })
class SystemTestVelocity {}

@Component({ name: "SystemTestTag" })
class SystemTestTag {}

function createWorld(): World {
    const world = new World({ logger: new NoopLogger() });
    world.components.register(SystemTestPosition);
    world.components.register(SystemTestVelocity);
    world.components.register(SystemTestTag);
    return world;
}

function spawn(world: World, components: Array<typeof SystemTestPosition>): number {
    const id = world.createEntity();
    for (const component of components) {
        world.addComponent(id, component);
    }
    return id;
}

describe("@System decorator", () => {
    it("reports decorated classes via isSystem", () => {
        @System({ name: "Decorated", query: { include: [SystemTestPosition] } })
        class DecoratedSystem extends SystemBase {
            public compute(): void {}
        }

        class Undecorated extends SystemBase {
            public compute(): void {}
        }

        expect(isSystem(DecoratedSystem)).toBe(true);
        expect(isSystem(Undecorated)).toBe(false);
    });

    it("stores query, required components, phase, and name on the constructor", () => {
        @System({
            name: "MetaSystem",
            query: { include: [SystemTestPosition], exclude: [SystemTestTag] },
            requiredComponents: [SystemTestVelocity],
            computeAfter: [],
            phase: SystemPhase.POST,
        })
        class MetaSystem extends SystemBase {
            public compute(): void {}
        }

        const meta = getSystemMetadata(MetaSystem);

        expect(meta.name).toBe("MetaSystem");
        expect(meta.phase).toBe(SystemPhase.POST);
        expect(meta.query.include).toEqual([SystemTestPosition]);
        expect(meta.query.exclude).toEqual([SystemTestTag]);
        expect(meta.requiredComponents).toEqual(new Set([SystemTestVelocity]));
        expect(meta.computeAfter).toEqual(new Set());
    });

    it("defaults phase to MAIN when phase is omitted", () => {
        @System({ name: "DefaultPhase", query: {} })
        class DefaultPhaseSystem extends SystemBase {
            public compute(): void {}
        }

        expect(getSystemMetadata(DefaultPhaseSystem).phase).toBe(SystemPhase.MAIN);
    });

    it("throws ErrMissingSystemMetadata when metadata is absent", () => {
        class PlainSystem extends SystemBase {
            public compute(): void {}
        }

        expect(() => getSystemMetadata(PlainSystem as SystemCtor)).toThrow(
            ErrMissingSystemMetadata,
        );
    });

    it("throws ErrNotASystem when the target does not extend SystemBase", () => {
        expect(() => {
            @System({ name: "Invalid", query: {} })
            class NotASystem {}
        }).toThrow(ErrNotASystem);
    });
});

describe("SystemsManager.register", () => {
    it("throws when the same constructor is registered twice", () => {
        @System({ name: "Once", query: {} })
        class OnceSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        const manager = world.systems;
        const instance = new OnceSystem();

        manager.register(instance);
        expect(() => manager.register(instance)).toThrow("Duplicate system");
    });

    it("collects component types referenced by the query and requiredComponents", () => {
        @System({
            name: "NeedsComponents",
            query: {
                include: [SystemTestPosition],
                exclude: [SystemTestTag],
                anyOf: [SystemTestVelocity],
            },
            requiredComponents: [SystemTestVelocity],
        })
        class NeedsComponentsSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        world.systems.register(new NeedsComponentsSystem());

        const required = world.systems.getRequiredComponents();

        expect(required.has(SystemTestPosition)).toBe(true);
        expect(required.has(SystemTestVelocity)).toBe(true);
        expect(required.has(SystemTestTag)).toBe(true);
    });

    it("returns a registered instance from get", () => {
        @System({ name: "Retrievable", query: {} })
        class RetrievableSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        const instance = new RetrievableSystem();
        world.systems.register(instance);

        expect(world.systems.get(RetrievableSystem)).toBe(instance);
    });

    it("throws from get when the system was never registered", () => {
        @System({ name: "Missing", query: {} })
        class MissingSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();

        expect(() => world.systems.get(MissingSystem)).toThrow("System not registered");
    });
});

describe("SystemsManager.update", () => {
    let executionOrder: string[];

    beforeEach(() => {
        executionOrder = [];
    });

    function track(name: string) {
        return () => executionOrder.push(name);
    }

    it("calls onInit once before the first compute pass", () => {
        @System({ name: "InitOnce", query: {} })
        class InitOnceSystem extends SystemBase {
            public onInit = vi.fn((_ctx: SystemInitContext) => {});
            public compute(): void {}
        }

        const world = createWorld();
        const system = new InitOnceSystem();
        world.systems.register(system);

        world.systems.update(FRAME_TIME);
        world.systems.update(FRAME_TIME);

        expect(system.onInit).toHaveBeenCalledTimes(1);
        expect(system.onInit).toHaveBeenCalledWith({
            world,
            logger: expect.any(NoopLogger),
        });
    });

    it("passes query-matched entity ids to compute", () => {
        @System({ name: "QueryRunner", query: { include: [SystemTestPosition] } })
        class QueryRunnerSystem extends SystemBase {
            public seen: number[] = [];
            public compute(ctx: SystemComputeContext): void {
                this.seen = [...ctx.entities];
            }
        }

        const world = createWorld();
        const matching = spawn(world, [SystemTestPosition]);
        spawn(world, [SystemTestVelocity]);
        const system = new QueryRunnerSystem();
        world.systems.register(system);

        world.systems.update(FRAME_TIME);

        expect(system.seen.sort()).toEqual([matching]);
    });

    it("passes world, time, and logger into compute", () => {
        @System({ name: "ContextCheck", query: {} })
        class ContextCheckSystem extends SystemBase {
            public last: SystemComputeContext | undefined;
            public compute(ctx: SystemComputeContext): void {
                this.last = ctx;
            }
        }

        const world = createWorld();
        const system = new ContextCheckSystem();
        world.systems.register(system);

        world.systems.update(FRAME_TIME);

        expect(system.last?.world).toBe(world);
        expect(system.last?.time).toBe(FRAME_TIME);
        expect(system.last?.logger).toBeInstanceOf(NoopLogger);
        expect(system.last?.entities).toEqual([]);
    });

    it("runs PRE systems before MAIN and POST systems", () => {
        @System({ name: "pre", query: {}, phase: SystemPhase.PRE })
        class PreSystem extends SystemBase {
            public compute = track("pre");
        }

        @System({ name: "main", query: {}, phase: SystemPhase.MAIN })
        class MainSystem extends SystemBase {
            public compute = track("main");
        }

        @System({ name: "post", query: {}, phase: SystemPhase.POST })
        class PostSystem extends SystemBase {
            public compute = track("post");
        }

        const world = createWorld();
        world.systems.register(new PostSystem());
        world.systems.register(new MainSystem());
        world.systems.register(new PreSystem());

        world.systems.update(FRAME_TIME);

        expect(executionOrder).toEqual(["pre", "main", "post"]);
    });

    it("runs computeAfter dependencies before dependents within MAIN phase", () => {
        @System({ name: "first", query: {}, phase: SystemPhase.MAIN })
        class FirstSystem extends SystemBase {
            public compute = track("first");
        }

        @System({
            name: "second",
            query: {},
            phase: SystemPhase.MAIN,
            computeAfter: [FirstSystem],
        })
        class SecondSystem extends SystemBase {
            public compute = track("second");
        }

        const world = createWorld();
        world.systems.register(new SecondSystem());
        world.systems.register(new FirstSystem());

        world.systems.update(FRAME_TIME);

        expect(executionOrder).toEqual(["first", "second"]);
    });

    it("throws when a computeAfter dependency was never registered", () => {
        @System({ name: "orphan", query: {}, phase: SystemPhase.MAIN })
        class OrphanSystem extends SystemBase {
            public compute(): void {}
        }

        @System({
            name: "dependent",
            query: {},
            phase: SystemPhase.MAIN,
            computeAfter: [OrphanSystem],
        })
        class DependentSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        world.systems.register(new DependentSystem());

        expect(() => world.systems.update(FRAME_TIME)).toThrow(
            "Dependency OrphanSystem not registered",
        );
    });

    it("throws when MAIN-phase systems form a dependency cycle", () => {
        class CycleASystem extends SystemBase {
            public compute(): void {}
        }
        class CycleBSystem extends SystemBase {
            public compute(): void {}
        }

        System({
            name: "cycleA",
            query: {},
            phase: SystemPhase.MAIN,
            computeAfter: [CycleBSystem],
        })(CycleASystem);
        System({
            name: "cycleB",
            query: {},
            phase: SystemPhase.MAIN,
            computeAfter: [CycleASystem],
        })(CycleBSystem);

        const world = createWorld();
        world.systems.register(new CycleASystem());
        world.systems.register(new CycleBSystem());

        expect(() => world.systems.update(FRAME_TIME)).toThrow(ErrDAGCycleDetected);
    });
});
