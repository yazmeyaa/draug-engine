import { System, SystemBase, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { FlappyTag } from "../components/flappy-tag";
import type { World } from "@amber-game/engine/ecs/world";
import { GameActions } from "../resources/actions";
import type { IStorage } from "@amber-game/engine/ecs/components";
import { Velocity } from "../components/velocity";

@System({
    query: {
        include: [FlappyTag, Velocity]
    }
})
export class InputSystem extends SystemBase {
    private actionsResource!: GameActions;
    private velocityStore!: IStorage<Velocity>;

    public onInit(world: World): void {
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