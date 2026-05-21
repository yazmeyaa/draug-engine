import { World } from "../ecs/world";
import { Clock } from "./clock";

export type StepFunction = (dt: number, world: World) => void;
export type PlatformLoop = (callback: () => void) => void;

export class Loop {
    private running = false;

    constructor(
        private readonly clock: Clock,
        private readonly stepFn: StepFunction,
        private readonly platformLoop: PlatformLoop,
    ) { };

    public start(world: World) {
        this.running = true;

        const loop = () => {
            if (!this.running) return;

            this.clock.tick();
            this.stepFn(this.clock.deltaMs, world);

            this.platformLoop(loop);
        };

        this.platformLoop(loop);
    }

    public stop() {
        this.running = false;
    }
};