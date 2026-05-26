import type { ColliderRectangle } from "../components/collider";
import type { Position } from "@draug/engine/std-components";

export type ColliderBox = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export function getColliderBox(
    position: Readonly<Position>,
    collider: Readonly<ColliderRectangle>,
): ColliderBox {
    return {
        top: position.value.y + collider.offsetY,
        right: position.value.x + collider.width + collider.offsetX,
        bottom: position.value.y + collider.height + collider.offsetY,
        left: position.value.x + collider.offsetX,
    };
}

/** Strict AABB overlap test (touching edges does not count). */
export function intersectsAABB(a: Readonly<ColliderBox>, b: Readonly<ColliderBox>): boolean {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

/** Bounds swept by the bird between the previous and current physics step. */
export function unionAABB(a: Readonly<ColliderBox>, b: Readonly<ColliderBox>): ColliderBox {
    return {
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        top: Math.min(a.top, b.top),
        bottom: Math.max(a.bottom, b.bottom),
    };
}
