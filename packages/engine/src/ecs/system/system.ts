import { DAGNode, topologicalSort } from '../../core/graph/dag';
import type { ClassType, ComponentType } from '../../types/class'
import type { World } from "../world";
import type { QueryParameters } from '../query';
import type { Logger } from '../../logger';
import type { Time } from '../../runtime/clock';


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
export class ErrSystemPhaseDependencyViolation extends SystemError {
    constructor(target: SystemCtor, relation: "computeAfter" | "computeBefore", dependency: SystemCtor) {
        super(target);
        this.message = `${this.message}: ${relation} dependency "${dependency.name}" conflicts with phase ordering for "${target.name}".`;
    }
}

export enum SystemPhase {
    PRE,
    MAIN,
    POST,
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
    /**
     * Systems that must run after this one.
     *
     * This is the inverse form of {@link SystemMetadata.computeAfter} and is useful when
     * expressing ordering from the perspective of the current system (for example,
     * "run this system before RenderSystem").
     */
    computeBefore?: Set<SystemCtor>;
    phase?: SystemPhase;
    name: string;
};
export type SystemDecoratorProps = {
    query: SystemMetadata['query'];
    requiredComponents?: ComponentType[];
    computeAfter?: SystemCtor[];
    computeBefore?: SystemCtor[];
    phase?: SystemPhase;
    name: SystemMetadata['name'];
};
const SystemMetadataSymbol = Symbol("system");
type FunctionWithMetadata = Function & { [SystemMetadataSymbol]?: SystemMetadata };

/**
 * Decorates a {@link SystemBase} subclass with execution metadata.
 *
 * @throws ErrNotASystem when target does not extend SystemBase.
 */
export function System(props: SystemDecoratorProps): ClassDecorator {
    return (target: Function) => {
        const systemTarget = target as FunctionWithMetadata;

        if (!(target.prototype instanceof SystemBase)) {
            throw new ErrNotASystem(target);
        }

        const query = { ...props.query };
        const requiredComponents = new Set(props.requiredComponents);
        const computeAfter = new Set(props.computeAfter);
        const computeBefore = new Set(props.computeBefore);
        const phase = props.phase ?? SystemPhase.MAIN;
        const name = props.name ?? target.name;
        const metadata: SystemMetadata = {
            query,
            requiredComponents,
            computeAfter,
            computeBefore,
            phase,
            name,
        };

        systemTarget[SystemMetadataSymbol] = metadata;
    };
}

/** Returns decorator metadata for a system constructor. */
export function getSystemMetadata(system: SystemCtor): SystemMetadata {
    if (hasMetadata(system)) {
        return system[SystemMetadataSymbol] as SystemMetadata;
    }
    throw new ErrMissingSystemMetadata(system);
}


export function hasMetadata(ctor: Function): ctor is Required<FunctionWithMetadata> {
    return SystemMetadataSymbol in ctor;
}

export function isSystem(ctor: Function): boolean {
    return hasMetadata(ctor);
}


export type SystemCtor<T extends SystemBase = SystemBase> = ClassType<T>;

/**
 * Arguments passed to {@link SystemBase.compute} on each {@link SystemsManager.update} call.
 */
export type SystemComputeContext = {
    /** Entity IDs from the query for this {@link SystemBase.compute} invocation. */
    readonly entities: number[];
    /** ECS world instance. */
    readonly world: World;
    /** Delta time (seconds or your engine's convention) since the previous update. */
    readonly time: Time;
    /** Logger instance for debugging and diagnostics. */
    readonly logger: Logger;
};

export type SystemInitContext = {
    world: World;
    logger: Logger;
};

/**
 * Base class for ECS systems executed by {@link SystemsManager}.
 *
 * Subclasses declare their query and dependencies with {@link System} metadata,
 * then implement frame logic in {@link compute}.
 */
export abstract class SystemBase {
    /**
     * Logic for one systems pass: run for all entities in {@link SystemComputeContext.entities}.
     */
    public abstract compute(ctx: SystemComputeContext): void;

    public onInit?(ctx: SystemInitContext): void;
};

/** Registers systems, computes execution order and runs update passes. */
export class SystemsManager {
    private systems_ = new Map<SystemCtor, SystemBase>();
    private executionOrder_: SystemBase[] = [];
    private requiredComponents_: Set<ComponentType> = new Set();
    private initializedSystems_ = new Set<SystemBase>();

    private dirty_ = true;

    constructor(
        private readonly world: World,
        private readonly logger: Logger,
    ) { }

    /** Returns union of all component types required by registered systems. */
    public getRequiredComponents(): Set<ComponentType> {
        return this.requiredComponents_;
    }

    /**
     * Registers one system instance.
     *
     * @throws Error for duplicate system constructors.
     */
    public register<T extends SystemBase>(sys: T): void {
        const ctor = sys.constructor as SystemCtor<T>;
        if (this.systems_.has(ctor)) throw new Error("Duplicate system");
        const { query, requiredComponents } = getSystemMetadata(ctor);

        this.systems_.set(ctor, sys);
        this.dirty_ = true;

        const q = query;

        for (const c of q.include ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.exclude ?? [])
            this.requiredComponents_.add(c);

        for (const c of q.anyOf ?? [])
            this.requiredComponents_.add(c);
        for (const c of requiredComponents)
            this.requiredComponents_.add(c);

        const meta = getSystemMetadata(ctor);

        this.logger.debug(() => `[Systems]: system "${meta.name}" was registered`);
    }

    /** Builds execution order and runs one-time system initialization hooks. */
    public build(): void {
        this.buildSystemsArray();
        for (const sys of this.systems_.values()) {
            if (!this.initializedSystems_.has(sys)) {
                sys.onInit?.({ world: this.world, logger: this.logger });
                this.initializedSystems_.add(sys);
            }
        }
        this.logger.debug(() => `Built ${this.systems_.size} systems`);
        this.dirty_ = false;
    }

    private rebuild(): void {
        this.build();
    };

    /**
     * Gets a registered system instance by constructor.
     *
     * @throws Error when system is not registered.
     */
    public get<T extends SystemBase>(ctor: SystemCtor<T>): T {
        const s = this.systems_.get(ctor);

        if (!s)
            throw new Error("System not registered");
        return s as T;
    }

    /**
     * Executes all systems in build order for one frame.
     */
    public update(time: Time): void {
        if (this.dirty_)
            this.rebuild();

        this.world.events.swapAll();

        for (const s of this.executionOrder_) {
            const { query } = getSystemMetadata(s.constructor as SystemCtor)
            const entities = this.world.query(query);
            s.compute({
                world: this.world,
                entities,
                time,
                logger: this.logger,
            });
        }
    }

    private buildSystemsArray(): void {
        const phasePriority = new Map<SystemPhase, number>([
            [SystemPhase.PRE, 0],
            [SystemPhase.MAIN, 1],
            [SystemPhase.POST, 2],
        ]);
        const preMap = new Map<SystemCtor, DAGNode<SystemBase>>();
        const mainMap = new Map<SystemCtor, DAGNode<SystemBase>>();
        const postMap = new Map<SystemCtor, DAGNode<SystemBase>>();
        const systemPhase = new Map<SystemCtor, SystemPhase>();

        const mapByPhase = (phase: SystemPhase): Map<SystemCtor, DAGNode<SystemBase>> => {
            switch (phase) {
                case SystemPhase.PRE:
                    return preMap;
                case SystemPhase.MAIN:
                    return mainMap;
                case SystemPhase.POST:
                    return postMap;
            }
        };

        for (const [ctor, system] of this.systems_.entries()) {
            const meta = getSystemMetadata(ctor);
            const phase = meta.phase ?? SystemPhase.MAIN;
            const map = mapByPhase(phase);

            map.set(ctor, new DAGNode(system));
            systemPhase.set(ctor, phase);
        }

        const phaseMaps = [preMap, mainMap, postMap];
        for (const phaseMap of phaseMaps) {
            for (const ctor of phaseMap.keys()) {
                const currentNode = phaseMap.get(ctor)!;
                const currentPhase = systemPhase.get(ctor)!;
                const { computeAfter, computeBefore } = getSystemMetadata(ctor);

                for (const depCtor of computeAfter ?? []) {
                    const dependencyPhase = systemPhase.get(depCtor);
                    if (dependencyPhase === undefined) {
                        throw new Error(`Dependency ${depCtor.name} not registered`);
                    }

                    const currentPhasePriority = phasePriority.get(currentPhase)!;
                    const dependencyPhasePriority = phasePriority.get(dependencyPhase)!;

                    if (dependencyPhasePriority > currentPhasePriority) {
                        throw new ErrSystemPhaseDependencyViolation(ctor, "computeAfter", depCtor);
                    }

                    if (dependencyPhase === currentPhase) {
                        const depNode = phaseMap.get(depCtor)!;
                        depNode.vertices.push(currentNode);
                    }
                }

                for (const depCtor of computeBefore ?? []) {
                    const dependencyPhase = systemPhase.get(depCtor);
                    if (dependencyPhase === undefined) {
                        throw new Error(`Dependency ${depCtor.name} not registered`);
                    }

                    const currentPhasePriority = phasePriority.get(currentPhase)!;
                    const dependencyPhasePriority = phasePriority.get(dependencyPhase)!;

                    if (dependencyPhasePriority < currentPhasePriority) {
                        throw new ErrSystemPhaseDependencyViolation(ctor, "computeBefore", depCtor);
                    }

                    if (dependencyPhase === currentPhase) {
                        const depNode = phaseMap.get(depCtor)!;
                        currentNode.vertices.push(depNode);
                    }
                }
            }
        }

        this.executionOrder_ = [
            ...topologicalSort(preMap.values()).map(x => x.data),
            ...topologicalSort(mainMap.values()).map(x => x.data),
            ...topologicalSort(postMap.values()).map(x => x.data),
        ];
    }
}