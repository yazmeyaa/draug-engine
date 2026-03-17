import { World } from "@/packages/engine/ecs/world";
import { Clock } from "@/packages/engine/runtime/clock";
import { GameLoop } from "@/packages/engine/runtime/game-loop";

export class BrowserGame {
    constructor(
        private world: World,
        private onWorldUpdate?: (world: World) => void,
    ){};
    public start(): void {
        const clock = new Clock();
        const loop = new GameLoop(clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start(window.requestAnimationFrame);
    };
};