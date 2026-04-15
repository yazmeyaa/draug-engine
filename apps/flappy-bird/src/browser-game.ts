import { AssetsManager } from "@amber-game/assets/assets";
import { World } from "@amber-game/engine/ecs/world";
import { Clock } from "@amber-game/engine/runtime/clock";
import { GameLoop } from "@amber-game/engine/runtime/game-loop";
import { Runtime } from '@amber-game/engine/runtime/runtime'

export class BrowserGame {
    public readonly runtime: Runtime;
    public readonly world = new World();
    constructor(
        private onWorldUpdate?: (world: World) => void,

    ) {
        const res = new AssetsManager();
        this.runtime = new Runtime(this.world, res);
    };
    public start(): void {
        const clock = new Clock();
        const loop = new GameLoop(clock, (dt) => {
            this.runtime.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start(window.requestAnimationFrame);
    };
};