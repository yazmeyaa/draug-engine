import { Bitmap } from "bitmap-index";
import { DAGNode, VisitedState } from "../../../core/graph/dag";
import type { World } from "./world";
import { UnregisteredComponentStorageError } from "./entity";
import { ClassType } from "../../../types/class";

export type SystemCtor<T extends System = System> = ClassType<T>;

export abstract class System {
    public abstract readonly requiredComponents: ClassType<any>[];
    public readonly computeAfter?: Set<SystemCtor> = new Set();
    public readonly name: string;

    constructor(name: string, deps: SystemCtor[] = []) {
        this.name = name;
        deps.forEach(d => this.computeAfter?.add(d));
    }

    public abstract compute(world: World, entities: number[]): void;
};


export class SystemsManager {
    private systems_ = new Map<SystemCtor, System>();
    private executionOrder_: System[] = [];
    private built = false;
    private systemsMask_ = new Map<SystemCtor, Bitmap>();

    public register<T extends System>(sys: T, world: World): void {
        if (this.built) throw new Error("Cannot register after build");
        const ctor = sys.constructor as SystemCtor<T>
        if (this.systems_.has(ctor))
            throw new Error("Duplicate system");

        this.systems_.set(ctor, sys);
        const bm = this.buildSystemComponentMask(sys, world);
        this.systemsMask_.set(ctor, bm);
    }

    private buildSystemComponentMask(system: System, world: World): Bitmap {
        const bm = new Bitmap();
        system.requiredComponents.forEach(x => {
            const store = world.components.getComponentStorage(x);
            if(!store) 
                throw new UnregisteredComponentStorageError(x);
            const id = store.id;
            bm.set(id);
        })

        return bm;
    }

    public build(): void {
        this.buildSystemsArray();
        this.built = true;
    }

    public get<T extends System>(ctor: SystemCtor<T>): T {
        const s = this.systems_.get(ctor);
    
        if (!s)
            throw new Error("System not registered");
        return s as T;
    }

    public update(world: World) {
        if (!this.built)
            throw new Error("Systems not built");
        
        for (const s of this.executionOrder_) {
            const mask = this.systemsMask_.get(s.constructor as SystemCtor)!;
            const entities = world.entities.query(mask);
            s.compute(world, entities);
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