import { System, SystemBase, type SystemComputeContext } from "@draug/engine";
import { Velocity } from "../components/velocity";
import { Transform } from "../components/transform";
import { InputSystem } from "./input";

@System({
    query: {
        include: [Transform, Velocity],
    },
    computeAfter: [InputSystem]
})
export class MovementSystem extends SystemBase {
    public compute(ctx: SystemComputeContext): void {
        const { entities } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const entityId = entities[i]!;

            const transform = ctx.world.components
                .getStorage(Transform)
                .tryGet(entityId);

            const velocity = ctx.world.components
                .getStorage(Velocity)
                .tryGet(entityId);

            if (!transform || !velocity) continue;

            transform.x += velocity.vx;
            transform.y += velocity.vy;
        }
    }

}