import type { World } from "../ecs/world";
import type { Loop } from "./loop";

export class Runtime {
    constructor(
        private readonly loop: Loop,
    ) { };
    public run(world: World): void {
        this.loop.start(world)
    }
};  