import type { AssetID } from "@draug/engine";
import { Component } from "@draug/engine";

@Component()
export class Renderable {
    constructor(
        public spriteId: AssetID,
        public layer: number,
    ){};
};