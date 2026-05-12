import { AssetsManager } from "@amber-game/assets/assets";
import { World } from "@amber-game/engine/ecs/world";
import { Clock, type TimeSource as TS } from "@amber-game/engine/runtime/clock";
import { GameLoop } from "@amber-game/engine/runtime/game-loop";
import { Runtime } from '@amber-game/engine/runtime/runtime'

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

export class BrowserGame {
    public readonly runtime: Runtime;
    constructor(
        private world: World,
        private onWorldUpdate?: (world: World) => void,

    ) {
        const res = new AssetsManager();
        this.runtime = new Runtime(world, res);
    };
    public start(): void {
        const ts = new TimeSource();
        const clock = new Clock(ts);
        const loop = new GameLoop(clock, (dt) => {
            this.runtime.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start(window.requestAnimationFrame);
    };
};