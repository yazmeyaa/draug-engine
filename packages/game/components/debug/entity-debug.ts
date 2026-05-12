import { Component } from "@amber-game/engine";

@Component()
export class EntityDebug {
    constructor(
        public name: string,
        public description?: string,
    ){}
}