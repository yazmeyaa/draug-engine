import { World } from "../engine/ecs/world";
import { Clock } from "../engine/runtime/clock";
import { GameLoop } from "../engine/runtime/game-loop";

export class NodeLoop {
    constructor(private world: World, private onWorldUpdate?: (world: World) => void) {}

    start() {
        const clock = new Clock();
        const loop = new GameLoop(clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start((cb) => globalThis.setTimeout(cb, 16));
    }
}