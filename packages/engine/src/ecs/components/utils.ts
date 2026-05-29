const registry = new Map<Function, number>();
let id = 0;

/** Metadata attached by the {@link Component} decorator. */
export type ComponentMetadata = {
    name: string;
    id: number;
};

const ComponentMetadataSymbol = Symbol("component");
type FunctionWithMetadata = Function & { [ComponentMetadataSymbol]: ComponentMetadata };
export type ComponentOptions = {
    name: string;
};

/**
 * Decorates a class as an ECS component type.
 *
 * Assigns a stable numeric type id used by query bitmasks.
 */
export function Component(options: ComponentOptions): ClassDecorator {
    return (target: Function) => {
        const metadata: ComponentMetadata = {
            name: options.name,
            id: ++id,
        };

        registry.set(target, metadata.id);
        (target as FunctionWithMetadata)[ComponentMetadataSymbol] = metadata;
    }
};

/**
 * Returns the numeric type id assigned to a component constructor.
 *
 * @throws Error when the class was not decorated with {@link Component}.
 */
export function getComponentId(ctor: Function): number {
    const id = registry.get(ctor);
    if (id === undefined) {
        throw new Error(`Component not registered: ${ctor.name}`);
    }
    return id;
}
class ErrNotComponent extends Error {
    constructor(ctor: Function) {
        super(`Class ${ctor.name} is not a Component. Use @Component decorator to define components.`);
    }
}

/**
 * Returns component decorator metadata.
 */
export function getComponentMetadata(component: Function): ComponentMetadata {
    if (isComponent(component)) {
        return component[ComponentMetadataSymbol] as ComponentMetadata;
    }
    throw new ErrNotComponent(component);
}

function isComponent(ctor: Function): ctor is FunctionWithMetadata {
    return ComponentMetadataSymbol in ctor;
}