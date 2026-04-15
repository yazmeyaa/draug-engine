const registry = new Map<Function, number>();
let id = 0;

export function Component(): ClassDecorator {
    return (target: Function) => {
        if (registry.has(target)) return;

        registry.set(target, ++id);
    }
};

export function getComponentId(ctor: Function): number {
    const id = registry.get(ctor);
    if (id === undefined) {
        throw new Error(`Component not registered: ${ctor.name}`);
    }
    return id;
}
