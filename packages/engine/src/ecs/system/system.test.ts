import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrDAGCycleDetected } from "../../core/graph/dag";
import { NoopLogger } from "../../logger";
import type { Time } from "../../runtime/clock";
import { Component } from "../components/utils";
import { World } from "../world";
import {
    ErrMissingSystemMetadata,
    ErrNotASystem,
    ErrSystemPhaseDependencyViolation,
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
        @System({ name: "ComputeAfterDependency", query: {} })
        class ComputeAfterDependencySystem extends SystemBase {
            public compute(): void {}
        }

        @System({
            name: "MetaSystem",
            query: { include: [SystemTestPosition], exclude: [SystemTestTag] },
            requiredComponents: [SystemTestVelocity],
            computeAfter: [ComputeAfterDependencySystem],
            computeBefore: [ComputeAfterDependencySystem],
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
        expect(meta.computeAfter).toEqual(new Set([ComputeAfterDependencySystem]));
        expect(meta.computeBefore).toEqual(new Set([ComputeAfterDependencySystem]));
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

    it("accepts systems that inherit from SystemBase through an intermediate base class", () => {
        abstract class AbstractTrackedSystem extends SystemBase {}

        expect(() => {
            @System({ name: "Tracked", query: {} })
            class TrackedSystem extends AbstractTrackedSystem {
                public compute(): void {}
            }
        }).not.toThrow();
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

    it("calls onInit once per system instance when new systems register after initial build", () => {
        @System({ name: "first", query: {} })
        class FirstSystem extends SystemBase {
            public onInit = vi.fn((_ctx: SystemInitContext) => {});
            public compute(): void {}
        }

        @System({ name: "second", query: {} })
        class SecondSystem extends SystemBase {
            public onInit = vi.fn((_ctx: SystemInitContext) => {});
            public compute(): void {}
        }

        const world = createWorld();
        const first = new FirstSystem();
        const second = new SecondSystem();

        world.systems.register(first);
        world.systems.update(FRAME_TIME);

        world.systems.register(second);
        world.systems.update(FRAME_TIME);

        expect(first.onInit).toHaveBeenCalledTimes(1);
        expect(second.onInit).toHaveBeenCalledTimes(1);
    });

    it("rebuilds execution order after registering systems at runtime", () => {
        @System({ name: "first", query: {} })
        class FirstSystem extends SystemBase {
            public compute = track("first");
        }

        @System({ name: "second", query: {} })
        class SecondSystem extends SystemBase {
            public compute = track("second");
        }

        const world = createWorld();
        world.systems.register(new FirstSystem());
        world.systems.update(FRAME_TIME);
        expect(executionOrder).toEqual(["first"]);

        executionOrder = [];
        world.systems.register(new SecondSystem());
        world.systems.update(FRAME_TIME);
        expect(executionOrder.sort()).toEqual(["first", "second"]);
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

    it("runs dependencies within PRE phase", () => {
        @System({ name: "pre-first", query: {}, phase: SystemPhase.PRE })
        class PreFirstSystem extends SystemBase {
            public compute = track("pre-first");
        }

        @System({
            name: "pre-second",
            query: {},
            phase: SystemPhase.PRE,
            computeAfter: [PreFirstSystem],
        })
        class PreSecondSystem extends SystemBase {
            public compute = track("pre-second");
        }

        @System({ name: "main", query: {}, phase: SystemPhase.MAIN })
        class MainSystem extends SystemBase {
            public compute = track("main");
        }

        const world = createWorld();
        world.systems.register(new MainSystem());
        world.systems.register(new PreSecondSystem());
        world.systems.register(new PreFirstSystem());

        world.systems.update(FRAME_TIME);

        expect(executionOrder).toEqual(["pre-first", "pre-second", "main"]);
    });

    it("runs dependencies within POST phase", () => {
        @System({ name: "main", query: {}, phase: SystemPhase.MAIN })
        class MainSystem extends SystemBase {
            public compute = track("main");
        }

        @System({ name: "post-first", query: {}, phase: SystemPhase.POST })
        class PostFirstSystem extends SystemBase {
            public compute = track("post-first");
        }

        @System({
            name: "post-second",
            query: {},
            phase: SystemPhase.POST,
            computeAfter: [PostFirstSystem],
        })
        class PostSecondSystem extends SystemBase {
            public compute = track("post-second");
        }

        const world = createWorld();
        world.systems.register(new PostSecondSystem());
        world.systems.register(new MainSystem());
        world.systems.register(new PostFirstSystem());

        world.systems.update(FRAME_TIME);

        expect(executionOrder).toEqual(["main", "post-first", "post-second"]);
    });

    it("runs computeBefore dependencies after dependency sources within MAIN phase", () => {
        @System({ name: "second", query: {}, phase: SystemPhase.MAIN })
        class SecondSystem extends SystemBase {
            public compute = track("second");
        }

        @System({
            name: "first",
            query: {},
            phase: SystemPhase.MAIN,
            computeBefore: [SecondSystem],
        })
        class FirstSystem extends SystemBase {
            public compute = track("first");
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

    it("throws when a computeBefore dependency was never registered", () => {
        @System({ name: "orphan", query: {}, phase: SystemPhase.MAIN })
        class OrphanSystem extends SystemBase {
            public compute(): void {}
        }

        @System({
            name: "dependent",
            query: {},
            phase: SystemPhase.MAIN,
            computeBefore: [OrphanSystem],
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

    it("throws when computeAfter conflicts with phase ordering", () => {
        @System({ name: "post", query: {}, phase: SystemPhase.POST })
        class PostSystem extends SystemBase {
            public compute(): void {}
        }

        @System({
            name: "main",
            query: {},
            phase: SystemPhase.MAIN,
            computeAfter: [PostSystem],
        })
        class MainSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        world.systems.register(new MainSystem());
        world.systems.register(new PostSystem());

        expect(() => world.systems.update(FRAME_TIME)).toThrow(ErrSystemPhaseDependencyViolation);
    });

    it("throws when computeBefore conflicts with phase ordering", () => {
        @System({ name: "pre", query: {}, phase: SystemPhase.PRE })
        class PreSystem extends SystemBase {
            public compute(): void {}
        }

        @System({
            name: "post",
            query: {},
            phase: SystemPhase.POST,
            computeBefore: [PreSystem],
        })
        class PostSystem extends SystemBase {
            public compute(): void {}
        }

        const world = createWorld();
        world.systems.register(new PreSystem());
        world.systems.register(new PostSystem());

        expect(() => world.systems.update(FRAME_TIME)).toThrow(ErrSystemPhaseDependencyViolation);
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
