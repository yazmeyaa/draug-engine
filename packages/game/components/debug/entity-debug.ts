import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class EntityDebug {
    constructor(
        public name: string,
        public description?: string,
    ){}
}