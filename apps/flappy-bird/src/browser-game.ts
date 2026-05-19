import {
    Clock,
    Engine,
    Loop,
    World,
    type TimeSource as TS,
} from "@draug/engine";

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

export class BrowserGame {
    private readonly engine_: Engine;
    private readonly world_ = new World();
    public get world(): World {
        return this.world_;
    }
    public get engine(): Engine {
        return this.engine_;
    }
    constructor(
        private onWorldUpdate?: (world: World) => void,
    ) {
        const clock = new Clock(new TimeSource());
        const loop = new Loop(this.world, clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        }, window.requestAnimationFrame.bind(window));
        this.engine_ = new Engine({ loop });
    };

    public start(): void {
        this.engine_.start();
    };
};