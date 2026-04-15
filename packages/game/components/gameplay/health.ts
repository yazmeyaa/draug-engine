import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Health {
    public constructor(public hp: number) {};
};