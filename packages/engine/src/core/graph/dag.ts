export enum VisitedState {
    Unvisited = 0,
    Visiting = 1,
    Visited = 2,
}

export class DAGNode<T> {
    public readonly data: T;
    public readonly vertices: DAGNode<T>[] = [];

    constructor(data: T, vertices?: DAGNode<T>[]) {
        this.data = data;
        if (vertices)
            this.vertices = vertices;
    }
};

export class ErrDAGCycleDetected extends Error {
    constructor() {
        super(`Cycle detected!`);
    }
}
export function topologicalSort<T>(nodes: Iterable<DAGNode<T>>): DAGNode<T>[] {
    const visited = new Map<DAGNode<T>, VisitedState>();
    const result: DAGNode<T>[] = [];

    const dfs = (node: DAGNode<T>) => {
        const state = visited.get(node) ?? VisitedState.Unvisited;

        if (state === VisitedState.Visited) return;
        if (state === VisitedState.Visiting) {
            throw new ErrDAGCycleDetected();
        }

        visited.set(node, VisitedState.Visiting);

        for (const child of node.vertices) {
            dfs(child);
        }

        visited.set(node, VisitedState.Visited);
        result.push(node);
    };


    for (const node of nodes) {
        dfs(node);
    }

    return result.reverse();
}
