import { AssetsManager } from "@amber-game/assets/assets";
import {
    Clock,
    GameLoop,
    Runtime,
    World,
    type TimeSource as TS,
} from "@amber-game/engine";

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

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
        const ts = new TimeSource();
        const clock = new Clock(ts);
        const loop = new GameLoop(clock, (dt) => {
            this.runtime.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start(window.requestAnimationFrame);
    };
};