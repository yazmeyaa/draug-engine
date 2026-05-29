import { World } from "../ecs/world";
import { Clock } from "./clock";

/** Callback executed every frame after clock tick. */
export type StepFunction = (dt: number, world: World) => void;
/** Platform scheduler used to queue the next frame callback. */
export type PlatformLoop = (callback: () => void) => void;

/**
 * Thin game loop wrapper.
 *
 * Ticks a {@link Clock}, runs the provided step callback, and schedules
 * the next frame via a host-provided scheduler.
 */
export class Loop {
    private running = false;

    constructor(
        private readonly clock: Clock,
        private readonly stepFn: StepFunction,
        private readonly platformLoop: PlatformLoop,
    ) { };

    /**
     * Starts the loop for the provided world.
     */
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

    /** Stops scheduling new frames. */
    public stop() {
        this.running = false;
    }
};