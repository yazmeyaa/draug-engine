import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Transform_stdlib" })
export class Transform {
    constructor(
        public readonly position = new Vector3(),
        public readonly rotation = new Vector3(),
        public readonly scale = new Vector3(1, 1, 1),
    ) { }
};