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