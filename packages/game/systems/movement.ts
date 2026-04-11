import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Transform} from "../components/transform";
import { Velocity } from "../components/velocity";
import type { ComponentType } from "@amber-game/engine/ecs/components";

export class MovementSystem extends System {
    public worldDependencies: ComponentType[] = [Transform, Velocity];
    public targetComponents: ComponentType[] = [Transform, Velocity];
    constructor() {
        super()
    }

    public compute(ctx: SystemComputeContext): void {
        const { entities } = ctx;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]!;
            const ref = ctx.world.getEntityRef(entity);
            const [p, v] = ref.with(Transform, Velocity);

            p.x += v.vx;
            p.y += v.vy;
        }
    }
};