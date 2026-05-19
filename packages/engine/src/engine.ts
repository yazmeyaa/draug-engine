import { AssetsManager } from "./assets/assets";
import { World } from "./ecs/world";
import { Runtime } from "./runtime/runtime";
import { Loop } from "./runtime/loop";

export type EngineConstructor = {
    loop: Loop
};

export class Engine {
    public readonly runtime: Runtime;
    public readonly world: World;
    public readonly assets: AssetsManager;
    constructor(params: EngineConstructor) {
        this.world = new World();
        this.runtime = new Runtime(params.loop);
        this.assets = new AssetsManager();
    }

    public init(): void {
        this.world.build();
    }

    public start(): void {
        this.runtime.run();
    }
};
