import { System, SystemComputeContext } from "@/packages/engine/core/ecs/system";
import { ClassType } from "@/packages/types/class";
import { Position } from "../components/position";
import { AttractorObject } from "../components/attrcator";
import { Velocity } from "../components/velocity";
import { EntityRef } from "@/packages/engine/core/ecs/entity";

export class AttractionSystem extends System {
    constructor() {
        super(AttractionSystem.name);
    }
    public queryComponents: ClassType<object>[] = [Position, Velocity];
    public requiredComponents: ClassType<object>[] = [Position, Velocity, AttractorObject];
    private attractionForce = 0.2;
    private damping = 0.98;
    private maxSpeed = 5;

    public compute(ctx: SystemComputeContext): void {
        const { entities, world } = ctx;

        const attractorEntities = world.query({ components: [AttractorObject, Position] });
        if (attractorEntities.length === 0) return;

        for (const id of entities) {
            const [pos, vel] = new EntityRef(world, id).with(Position, Velocity)

            let ax = 0;
            let ay = 0;

            for (const aid of attractorEntities) {
                if (aid === id) continue;

                const [aPos, attractor] = new EntityRef(world, aid).with(Position, AttractorObject);

                const dx = aPos.x - pos.x;
                const dy = aPos.y - pos.y;

                const distSq = dx * dx + dy * dy;
                if (distSq < 0.0001) continue;

                const dist = Math.sqrt(distSq);
                const force = (this.attractionForce * attractor.mass) / distSq;

                ax += (dx / dist) * force;
                ay += (dy / dist) * force;
            }

            vel.vx += ax;
            vel.vy += ay;

            const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
            if (speed > this.maxSpeed) {
                vel.vx = (vel.vx / speed) * this.maxSpeed;
                vel.vy = (vel.vy / speed) * this.maxSpeed;
            }

            vel.vx *= this.damping;
            vel.vy *= this.damping;
        }
    }
}