import { AssetsManager } from "./assets/assets";
import { World } from "./ecs/world";
import { NoopLogger, type Logger } from "./logger/logger";
import { Loop, Runtime } from "./runtime";

export type EngineConstructor = {
    loop: Loop;
    logger?: Logger;
};

export class Engine {
    public readonly runtime: Runtime;
    public readonly assets = new AssetsManager();
    public readonly world: World;
    public readonly logger: Logger;
    constructor(params: EngineConstructor) {
        this.runtime = new Runtime(params.loop);
        this.logger = params.logger ?? new NoopLogger();
        this.world = new World({
            logger: this.logger,
        });
    }

    public init(): void {
        this.world.build();
    }

    public start(): void {
        this.runtime.run(this.world);
    }
};
