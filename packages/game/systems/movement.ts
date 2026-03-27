import { type ComponentType } from "@amber-game/engine/ecs/component";
import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Position } from "../components/position";
import { Velocity } from "../components/velocity";

export class MovementSystem extends System {
    public requiredComponents: ComponentType[] = [Position, Velocity];
    public queryComponents: ComponentType[] = [Position, Velocity];
    constructor() {
        super()
    }

    public compute(ctx: SystemComputeContext): void {
        const { entities } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]!;
            const ref = ctx.world.getEntityRef(entity);
            const [p, v] = ref.with(Position, Velocity);

            p.x += v.vx;
            p.y += v.vy;
        }
    }
};