import { AssetsManager } from "@draug/engine";
import {
    Clock,
    GameLoop,
    Runtime,
    World,
    type TimeSource as TS,
} from "@draug/engine";

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

export class BrowserGame {
    public readonly runtime: Runtime;
    public get world(): World {
        return this.runtime.world;
    }
    constructor(
        private onWorldUpdate?: (world: World) => void,
    ) {
        const res = new AssetsManager();
        this.runtime = new Runtime(new World(), res);
    };

    public start(): void {
        const ts = new TimeSource();
        const clock = new Clock(ts);
        const loop = new GameLoop(clock, (dt) => {
            this.runtime.update(dt);
            this.onWorldUpdate?.(this.runtime.world);
        });
        loop.start(window.requestAnimationFrame);
    };
};