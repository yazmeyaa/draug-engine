import { System, SystemBase, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Velocity } from "../components/physics/velocity";
import { PlayerTag } from "../components/tags/player-tag";
import { PlayerActions } from "../resources/player-actions";

@System({
    query: {
        include: [Velocity, PlayerTag]
    }
})
export class InputSystem extends SystemBase {
    public compute(ctx: SystemComputeContext): void {
        const { world } = ctx;
        const actions = world.resources.get(PlayerActions);
        const vStore = world.components.getStorage(Velocity);
        for (const [id, action] of actions.data) {
            const velocity = vStore.tryGet(id);
            velocity.vx = action.movement.dx;
            velocity.vy = action.movement.dy;
        }
    }
}