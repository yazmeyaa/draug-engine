import type { AssetID } from "@amber-game/assets/assets";
import { Component } from "@amber-game/engine/ecs/components";

@Component()
export class Renderable {
    constructor(
        public spriteId: AssetID,
        public layer: number,
    ){};
};