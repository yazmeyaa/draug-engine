import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Rotation_stdlib" })
export class Rotation {
    constructor(public readonly value = new Vector3()) { }
};