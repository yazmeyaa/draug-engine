import type { ClassType } from "@amber-game/types/class";

export class ResourcesManager {
    private readonly items_ = new Map<ClassType<any>, unknown>();
    public insert<T extends object>(type: ClassType<T>, value: T): T {
        this.items_.set(type, value);
        return value;
    };
    public get<T extends object>(type: ClassType<T>): T {
        const value = this.items_.get(type);
        if (!value)
            throw new Error(`Resource of class ${type.name} does not exist!`);

        return value as T;
    }
    public getOrInsert<T extends object>(type: ClassType<T>, factory: () => T): T {
        let value: T | null = (this.items_.get(type) ?? null) as T | null;
        if (value === null) {
            value = factory();
            this.items_.set(type, value);
        }

        return value;
    }
    public remove<T>(type: ClassType<T>): void {
        this.items_.delete(type);
    }
};
