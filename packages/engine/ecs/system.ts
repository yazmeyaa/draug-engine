import { DAGNode, VisitedState } from '@amber-game/core/graph/dag';
import type { ClassType, ComponentType } from '@amber-game/types/class'
import type { World } from "./world";
import type { QueryParameters } from './query';


export class SystemError extends Error {
    constructor(target: Function) {
        super(`[System Error] (System "${target.name}".`)
    }
}
export class ErrNotASystem extends Error {
    constructor(target: Function) {
        super(`Provided class "${target.name}" is not a System! Extend your class from SystemBase.`)
    }
}
export class ErrMissingSystemMetadata extends SystemError {
    constructor(target: SystemCtor) {
        super(target);
        this.message = `${this.message}: Missing system metadata! Define system class with @System decorator.`
    }
};

export type SystemMetadata = {
    /**
     * ECS query definition used to select entities for this system execution.
     *
     * Determines the iteration set passed to {@link SystemBase.compute}.
     * The ECS runtime resolves entities based on this query each update.
     */
    query: Readonly<QueryParameters>;
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
    requiredComponents: Set<ComponentType>;
    /**
     * Systems that must run before this one. Pass constructor arguments
     * `super(OtherSystemCtor, ...)` to add edges; each listed system is scheduled earlier than
     * this instance. Used when {@link SystemsManager.build} computes a topological execution order.
     */
    computeAfter?: Set<SystemCtor>;
};
export type SystemDecoratorProps = {
    query: SystemMetadata['query'];
    requiredComponents?: ComponentType[];
    computeAfter?: SystemCtor[];
};
const SystemMetadataSymbol = Symbol("system");
type FunctionWithMetadata = Function & { [SystemMetadataSymbol]?: SystemMetadata };

export function System(props: SystemDecoratorProps): ClassDecorator {
    return (target: Function) => {
        const systemTarget = target as FunctionWithMetadata;

        if ('__proto__' in systemTarget && systemTarget.__proto__ !== SystemBase) {
            throw new ErrNotASystem(target);
        }

        const query = { ...props.query };
        const requiredComponents = new Set(props.requiredComponents);
        const computeAfter = new Set(props.computeAfter);
        const metadata: SystemMetadata = { query, requiredComponents, computeAfter };

        // Теперь TS позволяет записать значение
        systemTarget[SystemMetadataSymbol] = metadata;
    };
}

export function getSystemMetadata(system: SystemCtor): SystemMetadata {
    if (hasMetadata(system)) {
        return system[SystemMetadataSymbol] as SystemMetadata;
    }
    throw new ErrMissingSystemMetadata(system);
}


export function hasMetadata(ctor: Function): ctor is Required<FunctionWithMetadata> {
    return SystemMetadataSymbol in ctor;
}

export function isPlugin(ctor: Function): boolean {
    return hasMetadata(ctor);
}


export type SystemCtor<T extends SystemBase = SystemBase> = ClassType<T>;

/**
 * Arguments passed to {@link SystemBase.compute} on each {@link SystemsManager.update} call.
 */
export type SystemComputeContext = {
    /** Entity IDs from the query for this {@link SystemBase.compute} invocation. */
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
export abstract class SystemBase {
    /**
     * Logic for one systems pass: run for all entities in {@link SystemComputeContext.entities}.
     */
    public abstract compute(ctx: SystemComputeContext): void;

    public onInit?(world: World): void;
};


export class SystemsManager {
    private systems_ = new Map<SystemCtor, SystemBase>();
    private executionOrder_: SystemBase[] = [];
    private requiredComponents_: Set<ComponentType> = new Set();

    private dirty_ = true;

    constructor(
        private readonly world: World,
    ) { }

    public getRequiredComponents(): ComponentType[] {
        return Array.from(this.requiredComponents_);
    }

    public register<T extends SystemBase>(sys: T): void {
        const ctor = sys.constructor as SystemCtor<T>;
        if (this.systems_.has(ctor)) throw new Error("Duplicate system");
        const { query, requiredComponents } = getSystemMetadata(ctor);

        this.systems_.set(ctor, sys);

        const q = query;

        for (const c of q.include ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.exclude ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.anyOf ?? [])
            this.requiredComponents_.add(c);
        for (const c of requiredComponents)
            this.requiredComponents_.add(c);
    }

    public build(): void {
        this.buildSystemsArray();
        for (const sys of this.systems_.values())
            sys.onInit?.(this.world);
    }

    private rebuild(): void {
        this.build();
    };

    public get<T extends SystemBase>(ctor: SystemCtor<T>): T {
        const s = this.systems_.get(ctor);

        if (!s)
            throw new Error("System not registered");
        return s as T;
    }

    public update(dt: number): void {
        if (this.dirty_)
            this.rebuild();

        this.world.events.swapAll();

        for (const s of this.executionOrder_) {
            const { query } = getSystemMetadata(s.constructor as SystemCtor)
            const entities = this.world.query(query);
            s.compute({ entities, world: this.world, dt });
        }
    }

    private topoSort(nodes: Iterable<DAGNode<SystemBase>>): SystemBase[] {
        const visited = new Map<DAGNode<SystemBase>, VisitedState>();
        const result: SystemBase[] = [];

        const dfs = (node: DAGNode<SystemBase>) => {
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
        const map = new Map<SystemCtor, DAGNode<SystemBase>>();

        for (const [ctor, system] of this.systems_.entries()) {
            map.set(ctor, new DAGNode(system));
        }

        for (const ctor of this.systems_.keys()) {
            const currentNode = map.get(ctor)!;
            const { computeAfter } = getSystemMetadata(ctor);
            for (const depCtor of computeAfter ?? []) {
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