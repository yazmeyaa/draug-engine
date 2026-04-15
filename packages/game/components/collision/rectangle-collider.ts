import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class RectangleCollider {
    constructor(
        public width: number,
        public height: number,
    ) { };
};