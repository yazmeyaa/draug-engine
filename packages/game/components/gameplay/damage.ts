import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Damage {
    constructor(public value: number) {};
};