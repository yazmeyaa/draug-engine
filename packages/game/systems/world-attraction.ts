import { System, SystemBase, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { Transform } from "../components/render/transform";
import { AttractorObject } from "../components/physics/attrcator";
import { Velocity } from "../components/physics/velocity";

@System({
    query: {
        include: [Transform, Velocity],
    },
    requiredComponents: [AttractorObject]
})
export class AttractionSystem extends SystemBase {
    private attractionForce = 0.2;
    private damping = 0.98;
    private maxSpeed = 5;

    public compute(ctx: SystemComputeContext): void {
        const { entities, world } = ctx;

        const attractorEntities = world.query({ include: [AttractorObject, Transform] });
        if (attractorEntities.length === 0) return;

        for (const entity of entities) {
            const [pos, vel] = world.getEntityRef(entity).with(Transform, Velocity)

            let ax = 0;
            let ay = 0;

            for (const aEntity of attractorEntities) {
                if (aEntity === entity) continue;

                const [aPos, attractor] = world.getEntityRef(aEntity).with(Transform, AttractorObject);

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