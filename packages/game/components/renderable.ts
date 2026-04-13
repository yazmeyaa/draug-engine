import type { AssetID } from "@amber-game/assets/assets";

export class Renderable {
    constructor(
        public spriteId: AssetID,
        public layer: number,
    ){};
};