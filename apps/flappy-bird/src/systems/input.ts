import { FlappyTag } from "../components/flappy-tag";
import { GameActions } from "../resources/actions";
import { Velocity } from "../components/velocity";
import {
    System,
    SystemBase,
    type IStorage,
    type SystemComputeContext,
    type SystemInitContext,
} from "@draug/engine";

@System({
    query: {
        include: [FlappyTag, Velocity]
    }
})
export class InputSystem extends SystemBase {
    private actionsResource!: GameActions;
    private velocityStore!: IStorage<Velocity>;

    public onInit({world}: SystemInitContext): void {
        this.actionsResource = world.resources.getOrInsert(GameActions, () => new GameActions());
        this.velocityStore = world.components.getStorage(Velocity);
    }
    public compute(ctx: SystemComputeContext): void {
        for (const id of ctx.entities) {
            if (this.actionsResource.jump) {
                this.velocityStore.tryGet(id).vy = -8;
                this.actionsResource.jump = false;
            }
        }
    }
};