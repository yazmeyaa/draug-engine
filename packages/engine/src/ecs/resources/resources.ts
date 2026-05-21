import type { Logger } from "../../logger";
import type { ClassType } from "../../types/class";

export class ResourcesManager {
    private readonly items_ = new Map<ClassType<any>, unknown>();

    constructor(private readonly logger: Logger) { };

    public insert<T extends object>(type: ClassType<T>, value: T): T {
        this.items_.set(type, value);
        this.logger.debug(() => `[Resources]: Inserted new Resource "${type.name}"`);
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
            this.insert(type, value);
        }

        return value;
    }
    public remove<T>(type: ClassType<T>): void {
        this.logger.debug(() => `[Resources]: Removed resource "${type.name}"`);
        this.items_.delete(type);
    }
};
