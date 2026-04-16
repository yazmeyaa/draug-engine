import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Transform } from "../components/render/transform";
import { Velocity } from "../components/physics/velocity";
import { BaseSpeed } from "../components/gameplay/base-speed";
import type { QueryParameters } from "@amber-game/engine/ecs/query";

export class MovementSystem extends System {
    public readonly query: QueryParameters = {
        include: [Transform, Velocity, BaseSpeed]
    };
    constructor() {
        super()
    }

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