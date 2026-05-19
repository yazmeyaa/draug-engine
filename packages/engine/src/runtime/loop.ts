import { World } from "../ecs/world";
import { Clock } from "./clock";

export type StepFunction = (dt: number, world: World) => void;
export type PlatformLoop = (callback: () => void) => void;

export class Loop {
    private running = false;

    constructor(
        private readonly world: World,
        private readonly clock: Clock,
        private readonly stepFn: StepFunction,
        private readonly platformLoop: PlatformLoop,
    ) { };

    public start() {
        this.running = true;

        const loop = () => {
            if (!this.running) return;

            this.clock.tick();
            this.stepFn(this.clock.dt, this.world);

            this.platformLoop(loop);
        };

        this.platformLoop(loop);
    }

    public stop() {
        this.running = false;
    }
};