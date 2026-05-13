import { System, SystemBase, type SystemComputeContext } from "@draug/engine";
import { Transform } from "../components/render/transform";
import { Velocity } from "../components/physics/velocity";
import { BaseSpeed } from "../components/gameplay/base-speed";

@System({
    query: {
        include: [Transform, Velocity, BaseSpeed]
    }
})
export class MovementSystem extends SystemBase {
    public compute(ctx: SystemComputeContext): void {
        const { entities, dt } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]!;
            const ref = ctx.world.getEntityRef(entity);
            const [p, v, s] = ref.with(Transform, Velocity, BaseSpeed);
            p.x += s.speed * v.vx * (dt / 1000);
            p.y += s.speed * v.vy * (dt / 1000);
        }
    }
};