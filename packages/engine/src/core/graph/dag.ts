/** DFS visitation state used by topological sorting. */
export enum VisitedState {
    Unvisited = 0,
    Visiting = 1,
    Visited = 2,
}

/** Node in a directed acyclic graph. */
export class DAGNode<T> {
    public readonly data: T;
    public readonly vertices: DAGNode<T>[] = [];

    constructor(data: T, vertices?: DAGNode<T>[]) {
        this.data = data;
        if (vertices)
            this.vertices = vertices;
    }
};

/** Raised when a cycle is detected in a graph that must be acyclic. */
export class ErrDAGCycleDetected extends Error {
    constructor() {
        super(`Cycle detected!`);
    }
}
/**
 * Returns nodes in topological order.
 *
 * @throws ErrDAGCycleDetected when at least one directed cycle exists.
 */
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
