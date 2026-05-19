import { FlappyTag } from "../components/flappy-tag";
import { Transform } from "../components/transform";
import { Camera } from "../render/types";
import { MovementSystem } from "./movement";
import {
    System,
    SystemBase,
    type World,
    type IStorage,
    type SystemComputeContext,
} from "@draug/engine";


@System({
    computeAfter: [MovementSystem],
    query: {
        include: [FlappyTag, Transform]
    },
})
export class BindCameraSystem extends SystemBase {
    private transformStore!: IStorage<Transform>;
    private camera!: Camera;
    public onInit(world: World): void {
        this.camera = world.resources.get(Camera);
        this.transformStore = world.components.getStorage(Transform);
    }
    public compute(ctx: SystemComputeContext): void {
        for (const id of ctx.entities) {
            const t = this.transformStore.tryGet(id);
            this.camera.x = t.x + 250;
        }
    }
}