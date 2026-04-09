import type { ResourcesManager } from "../../resources/resource";
import type { World } from "../ecs/world";

export class Runtime {
    constructor(
        public readonly world: World,
        public readonly resources: ResourcesManager,
    ){};
    public update(dt: number) {
        this.world.update(dt);
    };
};  