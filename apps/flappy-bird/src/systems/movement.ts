import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Velocity } from "../components/velocity";
import { Transform } from "../components/transform";
import type { QueryParameters } from "@amber-game/engine/ecs/query";
import { InputSystem } from "./input";

export class MovementSystem extends System {
    public query: Readonly<QueryParameters> = {
        include: [Transform, Velocity],
    };
    constructor() {
        super(InputSystem)
    }
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