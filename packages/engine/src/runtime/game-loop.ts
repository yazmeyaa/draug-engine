import { Clock } from "./clock";

export type StepFunction = (dt: number) => void;

export class GameLoop {
    private running = false;

    constructor(
        private clock: Clock,
        private stepFn: StepFunction,
    ) { };


    public start(platformLoop: (callback: () => void) => void) {
        this.running = true;

        const loop = () => {
            if (!this.running) return;

            this.clock.tick();
            this.stepFn(this.clock.dt);

            platformLoop(loop);
        };

        platformLoop(loop);
    }

        public stop() {
        this.running = false;
    }
};