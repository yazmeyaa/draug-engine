import { DAGNode, VisitedState } from '@amber-game/core/graph/dag';
import type { ClassType, ComponentType } from '@amber-game/types/class'
import type { QueryParameters, World } from "./world";

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
     * ECS query definition used to select entities for this system execution.
     *
     * Determines the iteration set passed to {@link System.compute}.
     * The ECS runtime resolves entities based on this query each update.
     */
    public abstract query: Readonly<QueryParameters>;
    /**
     * Explicit list of component types required by the system but not necessarily
     * part of the iteration query.
     *
     * Used for:
     * - ensuring component storages are initialized in the world
     * - safe access via `world.components.getStorage`
     * - dependencies that should not affect entity selection
     *
     * This does NOT influence entity iteration; only runtime validation/setup.
     */
    public readonly requiredComponents_: ComponentType[] = [];
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

    public onInit?(world: World): void;
};


export class SystemsManager {
    private systems_ = new Map<SystemCtor, System>();
    private executionOrder_: System[] = [];
    private built_ = false;
    private requiredComponents_: Set<ComponentType> = new Set();

    constructor(
        private readonly world: World,
    ) { }

    public getRequiredComponents(): ComponentType[] {
        return Array.from(this.requiredComponents_);
    }

    public register<T extends System>(sys: T): void {
        if (this.built_) throw new Error("Cannot register after build");

        const ctor = sys.constructor as SystemCtor<T>;
        if (this.systems_.has(ctor)) throw new Error("Duplicate system");

        this.systems_.set(ctor, sys);

        const q = sys.query;

        for (const c of q.include ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.exclude ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.anyOf ?? [])
            this.requiredComponents_.add(c);
        for (const c of sys.requiredComponents_)
            this.requiredComponents_.add(c);
    }

    public build(): void {
        this.buildSystemsArray();
        for (const sys of this.systems_.values())
            sys.onInit?.(this.world);
        
        this.built_ = true;
    }

    public get<T extends System>(ctor: SystemCtor<T>): T {
        const s = this.systems_.get(ctor);

        if (!s)
            throw new Error("System not registered");
        return s as T;
    }

    public update(dt: number): void {
        if (!this.built_) throw new Error("Systems not built");
        this.world.events.swapAll();

        for (const s of this.executionOrder_) {
            const entities = this.world.query(s.query);
            s.compute({ entities, world: this.world, dt });
        }
    }

    private topoSort(nodes: Iterable<DAGNode<System>>): System[] {
        const visited = new Map<DAGNode<System>, VisitedState>();
        const result: System[] = [];

        const dfs = (node: DAGNode<System>) => {
            const state = visited.get(node) ?? VisitedState.Unvisited;

            if (state === VisitedState.Visited) return;
            if (state === VisitedState.Visiting) {
                throw new Error("Cycle detected");
            }

            visited.set(node, VisitedState.Visiting);

            for (const child of node.vertices) {
                dfs(child);
            }

            visited.set(node, VisitedState.Visited);
            result.push(node.data);
        };

        for (const node of nodes) {
            dfs(node);
        }

        return result.reverse();
    }

    private buildSystemsArray(): void {
        const map = new Map<SystemCtor, DAGNode<System>>();

        for (const [ctor, system] of this.systems_.entries()) {
            map.set(ctor, new DAGNode(system));
        }

        for (const [ctor, system] of this.systems_.entries()) {
            const currentNode = map.get(ctor)!;

            for (const depCtor of system.computeAfter ?? []) {
                const depNode = map.get(depCtor);
                if (!depNode) {
                    throw new Error(`Dependency ${depCtor.name} not registered`);
                }

                depNode.vertices.push(currentNode);
            }
        }

        this.executionOrder_ = this.topoSort(map.values());
    }
}