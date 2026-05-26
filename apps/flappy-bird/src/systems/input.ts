import { Velocity } from "@draug/engine/std-components";
import { FlappyTag } from "../components/flappy-tag";
import { GameActions } from "../resources/actions";
import {
    System,
    SystemBase,
    type ComponentStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";

@System({
    name: "InputSystem",
    query: {
        include: [FlappyTag, Velocity]
    }
})
export class InputSystem extends SystemBase {
    private actionsResource!: GameActions;
    private velocityStore!: ComponentStorage<Velocity>;

    public onInit({world}: SystemInitContext): void {
        this.actionsResource = world.resources.getOrInsert(GameActions, () => new GameActions());
        this.velocityStore = world.components.getStorage(Velocity);
    }
    public compute(ctx: SystemComputeContext): void {
        for (const id of ctx.entities) {
            if (this.actionsResource.jump) {
                this.velocityStore.tryGet(id).linear.y = -15;
                this.actionsResource.jump = false;
            }
        }
    }
};