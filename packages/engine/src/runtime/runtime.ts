import type { World } from "../ecs/world";
import type { Loop } from "./loop";

/**
 * Runtime adapter that starts a configured loop with a world instance.
 */
export class Runtime {
    constructor(
        private readonly loop: Loop,
    ) { };
    /** Starts world execution in the configured loop. */
    public run(world: World): void {
        this.loop.start(world)
    }
};  