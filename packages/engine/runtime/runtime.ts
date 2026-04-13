import type { AssetsManager } from "../../assets/assets";
import type { World } from "../ecs/world";

export class Runtime {
    constructor(
        public readonly world: World,
        public readonly resources: AssetsManager,
    ){};
    public update(dt: number) {
        this.world.update(dt);
    };
};  