import { System, SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Position } from "../components/position";
import { AttractorObject } from "../components/attrcator";
import { Velocity } from "../components/velocity";
import { ComponentType } from "@amber-game/engine/ecs/component";
    
export class AttractionSystem extends System {
    constructor() {
        super();
    }
    public queryComponents: ComponentType[] = [Position, Velocity];
    public requiredComponents: ComponentType[] = [Position, Velocity, AttractorObject];
    private attractionForce = 0.2;
    private damping = 0.98;
    private maxSpeed = 5;

    public compute(ctx: SystemComputeContext): void {
        const { entities, world } = ctx;

        const attractorEntities = world.query({ include: [AttractorObject, Position] });
        if (attractorEntities.length === 0) return;

        for (const entity of entities) {
            const [pos, vel] = entity.with(Position, Velocity)

            let ax = 0;
            let ay = 0;

            for (const aEntity of attractorEntities) {
                if (aEntity === entity) continue;

                const [aPos, attractor] = aEntity.with(Position, AttractorObject);

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