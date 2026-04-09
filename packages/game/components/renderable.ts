import type { ResourceID } from "@amber-game/resources/resource";

export class Renderable {
    constructor(
        public spriteId: ResourceID,
        public layer: number,
    ){};
};