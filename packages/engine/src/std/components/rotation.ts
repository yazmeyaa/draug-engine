import { Component } from "../../ecs/components";
import { Vector3 } from "../math/vector";

@Component({ name: "Rotation_stdlib" })
/** Standard rotation component (Euler-like 3D vector). */
export class Rotation {
    constructor(public readonly value = new Vector3()) { }
};