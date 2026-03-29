import { DAGNode, VisitedState } from '@amber-game/core/graph/dag';
import type { ClassType, ComponentType } from '@amber-game/types/class'
import type { World } from "./world";

export type SystemCtor<T extends System = System> = ClassType<T>;

/**
 * Arguments passed to {@link System.compute} on each {@link SystemsManager.update} call.
 */
export type SystemComputeContext = {
    /** Entity IDs from the query for this {@link System.compute} invocation. */
    entities: number[];
    /** ECS world instance. */
    world: World;
    /** Delta time (seconds or your engine's convention) since the previous update. */
    dt: number;
};

/**
 * Base class for ECS systems executed by {@link SystemsManager}.
 *
 * Subclasses declare which components they iterate over (`queryComponents`), which component
 * types must exist in the world for registration (`requiredComponents`), and optional ordering
 * relative to other systems (`computeAfter` / `super(OtherSystem)`).
 */
export abstract class System {
    /**
     * Component types used to build the entity set on each {@link SystemsManager.update}:
     * it runs `world.query({ include: queryComponents })` and passes the resulting IDs into
     * {@link System.compute} as {@link SystemComputeContext.entities}.
     */
    public abstract readonly targetComponents: ComponentType[];
    /**
     * Component types this system depends on for correct operation. {@link SystemsManager}
     * unions these across all registered systems; callers (for example world setup) use
     * {@link SystemsManager.getRequiredComponents} to register those component types on the world.
     */
    public abstract readonly worldDependencies: ComponentType[];
    /**
     * Systems that must run before this one. Pass constructor arguments
     * `super(OtherSystemCtor, ...)` to add edges; each listed system is scheduled earlier than
     * this instance. Used when {@link SystemsManager.build} computes a topological execution order.
     */
    public readonly computeAfter?: Set<SystemCtor> = new Set();

    /**
     * @param deps - System classes that should run before this system (same as adding to {@link System.computeAfter}).
     */
    constructor(...deps: SystemCtor[]) {
        deps.forEach(d => this.computeAfter?.add(d));
    }

    /**
     * Logic for one systems pass: run for all entities in {@link SystemComputeContext.entities}.
     */
    public abstract compute(ctx: SystemComputeContext): void;
};


export class SystemsManager {
    private systems_ = new Map<SystemCtor, System>();
    private executionOrder_: System[] = [];
    private built_ = false;
    private requiredComponents_: Set<ComponentType> = new Set();
    public getRequiredComponents(): ComponentType[] {
        return Array.from(this.requiredComponents_);
    }

    public register<T extends System>(sys: T): void {
        if (this.built_) throw new Error("Cannot register after build");
        const ctor = sys.constructor as SystemCtor<T>
        if (this.systems_.has(ctor))
            throw new Error("Duplicate system");

        this.systems_.set(ctor, sys);
        for (const c of sys.worldDependencies)
            this.requiredComponents_.add(c);
    }

    public build(): void {
        this.buildSystemsArray();
        this.built_ = true;
    }

    public get<T extends System>(ctor: SystemCtor<T>): T {
        const s = this.systems_.get(ctor);

        if (!s)
            throw new Error("System not registered");
        return s as T;
    }

    public update(world: World, dt: number) {
        if (!this.built_)
            throw new Error("Systems not built");
        world.events.swapAll();
        for (const s of this.executionOrder_) {
            const entities = world.query({ include: s.targetComponents })
            const ctx = { entities, world, dt } satisfies SystemComputeContext;
            s.compute(ctx);
        }
    }

    private topoSort(nodes: Iterable<DAGNode<System>>): System[] {
        const visited = new Map<DAGNode<System>, VisitedState>();
        const result: System[] = [];

        const dfs = (node: DAGNode<System>) => {
            const state = visited.get(node) ?? VisitedState.Unvisited;

            if (state === VisitedState.Visited) return;
            if (state === VisitedState.Visiting)
                throw new Error("Cycle detected");

            visited.set(node, VisitedState.Visiting);

            for (const child of node.vertices)
                dfs(child);

            visited.set(node, VisitedState.Visited);
            result.push(node.data);
        };

        for (const node of nodes)
            dfs(node);

        return result;
    }

    private buildSystemsArray() {
        const map = new Map<SystemCtor, DAGNode<System>>();

        // 1. Create nodes
        for (const [ctor, system] of this.systems_.entries()) {
            map.set(ctor, new DAGNode(system));
        }

        // 2. Create edges
        for (const [ctor, system] of this.systems_.entries()) {
            const currentNode = map.get(ctor)!;

            for (const depCtor of system.computeAfter ?? []) {
                const depNode = map.get(depCtor);
                if (!depNode)
                    throw new Error(`Dependency ${depCtor.name} not registered`);

                depNode.vertices.push(currentNode);
            }
        }

        // 3. Build execution order array.
        this.executionOrder_ = this.topoSort(map.values()).reverse();
    }
}