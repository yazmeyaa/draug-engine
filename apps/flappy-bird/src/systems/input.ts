import type { QueryParameters } from "@amber-game/engine/ecs/query";
import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { FlappyTag } from "../components/flappy-tag";
import type { World } from "@amber-game/engine/ecs/world";
import { GameActions } from "../resources/actions";
import type { IStorage } from "@amber-game/engine/ecs/components";
import { Velocity } from "../components/velocity";

export class InputSystem extends System {
    public query: Readonly<QueryParameters> = {
        include: [FlappyTag, Velocity]
    };
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