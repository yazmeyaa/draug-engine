import { Position } from "@draug/engine/std-components";
import { FlappyTag } from "../components/flappy-tag";
import { Camera } from "../render/types";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";
import { MovementSystem } from "@draug/engine/std-systems";

export const CAMERA_AHEAD_OFFSET = 200;

@System({
    name: "BindCameraSystem",
    computeAfter: [MovementSystem],
    query: {
        include: [FlappyTag, Position],
    },
})
export class BindCameraSystem extends SystemBase {
    private transformStore!: ComponentStorage<Position>;
    private camera!: Camera;

    public onInit({ world }: SystemInitContext): void {
        this.camera = world.resources.get(Camera);
        this.transformStore = world.components.getStorage(Position);
    }

    public compute(ctx: SystemComputeContext): void {
        for (const id of ctx.entities) {
            const t = this.transformStore.tryGet(id);
            this.camera.x = t.value.x + CAMERA_AHEAD_OFFSET;
        }
    }
}
