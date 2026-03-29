import type { ComponentType } from "@amber-game/engine/ecs/components";
import { System, type SystemComputeContext } from "@amber-game/engine/ecs/system";
import { CircleCollider } from "../components/circle-collider";
import { RectangleCollider } from "../components/rectangle-collider";
import { Position } from "../components/position";
import { COLLISION_EVENT_KEY } from "../events/collision";

export class CircleCollisionSystem extends System {
    public targetComponents: ComponentType[] = [CircleCollider, Position];
    public worldDependencies: ComponentType[] = [CircleCollider, RectangleCollider, Position];
    public compute(ctx: SystemComputeContext): void {
        const circles = ctx.entities;
        const rectangles = ctx.world.query({ include: [Position, RectangleCollider] });
        const pStore = ctx.world.components.getStorage(Position);
        const cStore = ctx.world.components.getStorage(CircleCollider);
        const rStore = ctx.world.components.getStorage(RectangleCollider);

        const buf = ctx.world.events.getBuffer(COLLISION_EVENT_KEY);

        for (let i = 0; i < circles.length; i++) {
            const currCircle = circles[i]!;
            const currCirclePos = pStore.tryGet(currCircle);
            const currCircleRad = cStore.tryGet(currCircle);
            for (let j = i + 1; j < circles.length; j++) {
                const otherCircle = circles[j]!;
                const otherPos = pStore.tryGet(otherCircle);
                const otherRad = cStore.tryGet(otherCircle);

                const dx = currCirclePos.x - otherPos.x;
                const dy = currCirclePos.y - otherPos.y;

                const distanceSq = dx * dx + dy * dy;
                const radiusSum = currCircleRad.radius + otherRad.radius;

                if (distanceSq <= radiusSum * radiusSum) {
                    buf.write({
                        objA: {
                            colliderId: currCircle,
                            position: { x: currCirclePos.x, y: currCirclePos.y }
                        },
                        objB: {
                            colliderId: otherCircle,
                            position: { x: otherPos.x, y: otherPos.y }
                        },
                    });
                }
            }

            for (let j = 0; j < rectangles.length; j++) {
                const rect = rectangles[j]!;
                const { height, width } = rStore.tryGet(rect);
                const rectPos = pStore.tryGet(rect);

                const left = rectPos.x - width / 2;
                const right = rectPos.x + width / 2;
                const top = rectPos.y - height / 2;
                const bottom = rectPos.y + height / 2;

                const closestX = Math.max(left, Math.min(currCirclePos.x, right));
                const closestY = Math.max(top, Math.min(currCirclePos.y, bottom));

                const dx = currCirclePos.x - closestX;
                const dy = currCirclePos.y - closestY;

                if (dx * dx + dy * dy <= currCircleRad.radius * currCircleRad.radius) {
                    buf.write({
                        objA: {
                            colliderId: currCircle,
                            position: { x: currCirclePos.x, y: currCirclePos.y }
                        },
                        objB: {
                            colliderId: rect,
                            position: { x: rectPos.x, y: rectPos.y }
                        },
                    });
                }
            }
        }
    }
}