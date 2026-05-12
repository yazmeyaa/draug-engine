import { Clock, type TimeSource, type World, GameLoop } from "@amber-game/engine";

export class NodeLoop {
    constructor(private world: World, private onWorldUpdate?: (world: World) => void) { }

    start() {
        const ts: TimeSource = {now: () => performance.now()};
        const clock = new Clock(ts);
        const loop = new GameLoop(clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start((cb) => globalThis.setTimeout(cb, 16));
    }
}
