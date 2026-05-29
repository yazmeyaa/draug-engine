/** Mutable 2D vector helper. */
export class Vector2 {
    constructor(
        public x = 0,
        public y = 0,
    ) { }
    public toVec3(z = 0): Vector3 {
        return new Vector3(this.x, this.y, z);
    };
    public toVec4(z = 0, w = 0): Vector4 {
        return new Vector4(this.x, this.y, z, w);
    };
    public clone(): Vector2 {
        return new Vector2(this.x, this.y);
    };
    public set(x: number, y: number): this {
        this.x = x;
        this.y = y;

        return this;
    };
    public equals(v: Vector2): boolean {
        return this.x === v.x && this.y === v.y;
    };
    public add(other: Vector2): this {
        this.x += other.x;
        this.y += other.y;

        return this;
    };
    public sub(other: Vector2): this {
        this.x -= other.x;
        this.y -= other.y;

        return this;
    };
    public mulScalar(s: number): this {
        this.x *= s;
        this.y *= s;

        return this;
    };
    public divScalar(s: number): this {
        if (s === 0) {
            this.x = 0;
            this.y = 0;
            return this;
        }
        this.x /= s;
        this.y /= s;

        return this;
    };
    public negate(): this {
        this.x *= -1;
        this.y *= -1;

        return this;
    };
    public length(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    };
    public normalize(): Vector2 {
        const m = this.length();
        if (m !== 0) {
            this.x = this.x / m;
            this.y = this.y / m;
        }

        return this;
    };
    public normalized(): Vector2 {
        return this.clone().normalize();
    };
};
/** Mutable 3D vector helper. */
export class Vector3 {
    constructor(
        public x = 0,
        public y = 0,
        public z = 0,
    ) { }

    public toVec2(): Vector2 {
        return new Vector2(this.x, this.y);
    };
    public toVec4(w = 0): Vector4 {
        return new Vector4(this.x, this.y, this.z, w);
    };
    public clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    };
    public set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    };
    public equals(v: Vector3): boolean {
        return this.x === v.x && this.y === v.y && this.z === v.z;
    };
    public add(other: Vector3): this {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;

        return this;
    };
    public sub(other: Vector3): this {
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;

        return this;
    };
    public mulScalar(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;

        return this;
    };
    public divScalar(s: number): this {
        if (s === 0) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            return this;
        }
        this.x /= s;
        this.y /= s;
        this.z /= s;

        return this;
    };
    public negate(): this {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;

        return this;
    };
    public length(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    };
    public normalize(): Vector3 {
        const m = this.length();
        if (m !== 0) {
            this.x = this.x / m;
            this.y = this.y / m;
            this.z = this.z / m;
        }
        
        return this;
    };
    public normalized(): Vector3 {
        return this.clone().normalize();
    };
};
/** Mutable 4D vector helper. */
export class Vector4 {
    constructor(
        public x = 0,
        public y = 0,
        public z = 0,
        public w = 0,
    ) { }

    public toVec2(): Vector2 {
        return new Vector2(this.x, this.y);
    };
    public toVec3(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    };
    public clone(): Vector4 {
        return new Vector4(this.x, this.y, this.z, this.w);
    };
    public set(x: number, y: number, z: number, w: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        return this;
    };
    public equals(v: Vector4): boolean {
        return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
    };
    public add(other: Vector4): this {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        this.w += other.w;

        return this;
    };
    public sub(other: Vector4): this {
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        this.w -= other.w;

        return this;
    };
    public mulScalar(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;

        return this;
    };
    public divScalar(s: number): this {
        if (s === 0) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 0;
            return this;
        }
        this.x /= s;
        this.y /= s;
        this.z /= s;
        this.w /= s;

        return this;
    };
    public negate(): this {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        this.w *= -1;

        return this;
    };
    public length(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
    };
    public normalize(): Vector4 {
        const m = this.length();
        if (m !== 0) {
            this.x = this.x / m;
            this.y = this.y / m;
            this.z = this.z / m;
            this.w = this.w / m;
        }
        
        return this;
    };
    public normalized(): Vector4 {
        return this.clone().normalize();
    };
};

/** Copies xy from `Vector2` into `Vector3` and sets z. */
export function vec2toVec3(vec: Vector2, out: Vector3, z = 0): Vector3 {
    out.x = vec.x;
    out.y = vec.y;
    out.z = z;
    return out;
};
/** Copies xy from `Vector2` into `Vector4` and sets z/w. */
export function vec2toVec4(vec: Vector2, out: Vector4, z = 0, w = 0): Vector4 {
    out.x = vec.x;
    out.y = vec.y;
    out.z = z;
    out.w = w;
    return out;
};
/** Copies xyz from `Vector3` into `Vector2` (drops z). */
export function vec3toVec2(vec: Vector3, out: Vector2): Vector2 {
    out.x = vec.x;
    out.y = vec.y;
    return out;
};
/** Copies xyz from `Vector3` into `Vector4` and sets w. */
export function vec3toVec4(vec: Vector3, out: Vector4, w = 0): Vector4 {
    out.x = vec.x;
    out.y = vec.y;
    out.z = vec.z;
    out.w = w;
    return out;
};
/** Copies xy from `Vector4` into `Vector2` (drops z/w). */
export function vec4toVec2(vec: Vector4, out: Vector2): Vector2 {
    out.x = vec.x;
    out.y = vec.y;
    return out;
};
/** Copies xyz from `Vector4` into `Vector3` (drops w). */
export function vec4toVec3(vec: Vector4, out: Vector3): Vector3 {
    out.x = vec.x;
    out.y = vec.y;
    out.z = vec.z;
    return out;
};
