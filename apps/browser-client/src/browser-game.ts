import { AssetsManager } from "@draug/assets/assets";
import {
    Runtime,
    World,
    GameLoop,
    Clock,
    type TimeSource as TS,
} from "@draug/engine";

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