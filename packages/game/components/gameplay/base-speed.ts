import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class BaseSpeed {
    constructor(public speed: number) {};
};