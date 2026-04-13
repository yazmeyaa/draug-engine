import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Transform } from "../components/transform";
import { Velocity } from "../components/velocity";
import type { ComponentType } from "@amber-game/engine/ecs/components";
import { BaseSpeed } from "../components/base-speed";

export class MovementSystem extends System {
    public worldDependencies: ComponentType[] = [Transform, Velocity, BaseSpeed];
    public targetComponents: ComponentType[] = [Transform, Velocity, BaseSpeed];
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