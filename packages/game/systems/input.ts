import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import type { ComponentType } from "@amber-game/types/class";
import { Velocity } from "../components/physics/velocity";
import { PlayerTag } from "../components/tags/player-tag";
import { PlayerActions } from "../resources/player-actions";

export class InputSystem extends System {
    public targetComponents: ComponentType[] = [Velocity, PlayerTag];
    public worldDependencies: ComponentType[] = [Velocity, PlayerTag];
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