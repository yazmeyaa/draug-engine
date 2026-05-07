import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Transform {
    constructor(
        public x: number,
        public y: number,
        public rotate: number,
        public scaleX: number,
        public scaleY: number,
    ) { };
};