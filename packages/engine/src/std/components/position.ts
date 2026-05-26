import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Transform_stdlib" })
export class Position {
    constructor(
        public readonly value = new Vector3(),
    ) { }
};