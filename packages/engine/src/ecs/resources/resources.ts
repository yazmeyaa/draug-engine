import type { Logger } from "../../logger";
import type { ClassType } from "../../types/class";

export type ResourceMetadata = {
    name: string;
};
type ResourceParams = {
    name: string;
};
const ResourceMetadataSymbol = Symbol("resource");
type FunctionWithMetadata = Function & { [ResourceMetadataSymbol]: ResourceMetadata };

/** Decorates a class as a world resource key type. */
export function Resource(params: ResourceParams): ClassDecorator {
    return (target: Function) => {
        const metadata: ResourceMetadata = {
            name: params.name,
        };
        (target as FunctionWithMetadata)[ResourceMetadataSymbol] = metadata;
    }
}

class ErrNotResource extends Error {
    constructor(ctor: Function) {
        super(`Class ${ctor.name} is not a Resource. Use @Resource decorator to define resources.`);
    }
}

/** Returns decorator metadata for a resource class. */
export function getResourceMetadata(resource: Function): ResourceMetadata {
    if (isResource(resource)) {
        return resource[ResourceMetadataSymbol] as ResourceMetadata;
    }
    throw new ErrNotResource(resource);
}

function isResource(ctor: Function): ctor is FunctionWithMetadata {
    return ResourceMetadataSymbol in ctor;
}

/** Typed key-value store for singleton-like world resources. */
export class ResourcesManager {
    private readonly items_ = new Map<ClassType<any>, unknown>();

    constructor(private readonly logger: Logger) { };

    /** Inserts or replaces a resource value for a type key. */
    public insert<T extends object>(type: ClassType<T>, value: T): T {
        this.items_.set(type, value);
        const metadata = getResourceMetadata(type);
        this.logger.debug(() => `[Resources]: Inserted new Resource "${metadata.name}"`);
        return value;
    };
    /**
     * Returns a resource by type.
     *
     * @throws Error when resource is missing.
     */
    public get<T extends object>(type: ClassType<T>): T {
        const value = this.items_.get(type);
        const meta = getResourceMetadata(type);
        if (!value)
            throw new Error(`Resource of class ${meta.name} does not exist!`);

        return value as T;
    }
    /** Gets existing resource or inserts a factory-produced value. */
    public getOrInsert<T extends object>(type: ClassType<T>, factory: () => T): T {
        let value: T | null = (this.items_.get(type) ?? null) as T | null;
        if (value === null) {
            value = factory();
            this.insert(type, value);
        }

        return value;
    }
    /** Removes a resource from storage. */
    public remove<T>(type: ClassType<T>): void {
        const meta = getResourceMetadata(type);
        this.logger.debug(() => `[Resources]: Removed resource "${meta.name}"`);
        this.items_.delete(type);
    }
};
