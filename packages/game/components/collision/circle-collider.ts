import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class CircleCollider {
    constructor(public radius: number){};
}