import type { QueryParameters } from "@amber-game/engine/ecs/query";
import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { FlappyTag } from "../components/flappy-tag";
import { Transform } from "../components/transform";
import type { World } from "@amber-game/engine/ecs/world";
import type { IStorage } from "@amber-game/engine/ecs/components";
import { Camera } from "../render/types";
import { MovementSystem } from "./movement";

export class BindCameraSystem extends System {
    public query: Readonly<QueryParameters> = {
        include: [FlappyTag, Transform]
    };
    constructor() {
        super(MovementSystem);
    }
    private transformStore!: IStorage<Transform>;
    private camera!: Camera;
    public onInit(world: World): void {
        this.camera = world.resources.get(Camera);
        this.transformStore = world.components.getStorage(Transform);
    }
    public compute(ctx: SystemComputeContext): void {
        for(const id of ctx.entities) 
        {
            const t = this.transformStore.tryGet(id);
            this.camera.x = t.x;
            this.camera.y = t.y;
        }
    }
}