import { Component } from "@amber-game/engine";

@Component()
export class RectangleCollider {
    constructor(
        public width: number,
        public height: number,
    ) { };
};