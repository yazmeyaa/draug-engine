import { DAGNode, VisitedState } from "../../../core/graph/dag";
import type { World } from "./world";
import { ClassType } from "../../../types/class";

export type SystemCtor<T extends System = System> = ClassType<T>;

export type SystemComputeContext = {
    entities: number[];
    world: World;
};

export abstract class System {
    public abstract readonly queryComponents: ClassType<object>[];
    public abstract readonly requiredComponents: ClassType<object>[];
    public readonly computeAfter?: Set<SystemCtor> = new Set();
    public readonly name: string;

    constructor(name: string, deps: SystemCtor[] = []) {
        this.name = name;
        deps.forEach(d => this.computeAfter?.add(d));
    }

    public abstract compute(ctx: SystemComputeContext): void;
};


export class SystemsManager {
    private systems_ = new Map<SystemCtor, System>();
    private executionOrder_: System[] = [];
    private built_ = false;
    private requiredComponents_: Set<ClassType<object>> = new Set();
    public get requiredComponents(): ClassType<object>[] {
        return Array.from(this.requiredComponents_);
    }

    public register<T extends System>(sys: T, world: World): void {
        if (this.built_) throw new Error("Cannot register after build");
        const ctor = sys.constructor as SystemCtor<T>
        if (this.systems_.has(ctor))
            throw new Error("Duplicate system");

        this.systems_.set(ctor, sys);
        for(const c of sys.requiredComponents) 
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

    public update(world: World) {
        if (!this.built_)
            throw new Error("Systems not built");

        for (const s of this.executionOrder_) {
            const entities = world.query({ components: s.queryComponents })
            const ctx = { entities, world } satisfies SystemComputeContext;
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