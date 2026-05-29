import { AssetsManager } from "./assets/assets";
import { ECS_DEFAULTS } from "./ecs/constant";
import { World } from "./ecs/world";
import { NoopLogger, type Logger } from "./logger/logger";
import { Loop, Runtime } from "./runtime";

/** Constructor options for {@link Engine}. */
export type EngineConstructor = {
    loop: Loop;
    logger?: Logger;
    maxEntityCount?: number;
};

/** Readonly tick counter provider used by host integrations. */
export interface TickProvider {
    getTick(): number;
};

/**
 * High-level engine bootstrap combining world, runtime and assets.
 */
export class Engine implements TickProvider {
    public readonly runtime: Runtime;
    public readonly assets = new AssetsManager();
    public readonly world: World;
    public readonly logger: Logger;
    constructor(params: EngineConstructor) {
        this.runtime = new Runtime(params.loop);
        this.logger = params.logger ?? new NoopLogger();
        this.world = new World({
            logger: this.logger,
            maxEntityCount: params.maxEntityCount ?? ECS_DEFAULTS.MAX_ENTITY_COUNT,
        });
    }
    
    /**
     * Returns number of completed world updates.
     */
    public getTick(): number {
        return this.world.updatesCount;
    }

    /** Finalizes world bootstrap (plugins, etc.). */
    public init(): void {
        this.world.build();
    }

    /** Starts the runtime loop. */
    public start(): void {
        this.runtime.run(this.world);
    }
};
