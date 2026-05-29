import type { ClassType, ComponentType } from "../../types/class";
import { SystemBase } from "../system";
import type { World } from "../world";
import { DAGNode, topologicalSort, ErrDAGCycleDetected } from '../../core/graph/dag';
import type { Logger } from "../../logger";

export type PluginID = string;
export type PluginConstructor = ClassType<PluginBase>;

/** Declares plugin-level runtime dependencies. */
export type PluginDependencies = {
    components?: ComponentType[];
    resources?: ClassType<any>[];
    systems?: ClassType<SystemBase>[];
    plugins?: Array<{ plugin: PluginConstructor; version?: string }>;
}

/** Metadata attached by the {@link Plugin} decorator. */
export interface PluginMetadata {
    id?: PluginID;
    version: string;
    name: string;
    dependencies?: PluginDependencies;
}

const PluginMetadataSymbol = Symbol("plugin");

/**
 * Decorates a class as a plugin.
 *
 * @throws ErrNotAPlugin when target does not directly extend PluginBase.
 */
export function Plugin(metadata: PluginMetadata): ClassDecorator {
    return (target: Function) => {
        if ('__proto__' in target && target.__proto__ !== PluginBase)
            throw new ErrNotAPlugin(target);

        (target as FunctionWithMetadata)[PluginMetadataSymbol] = metadata;
    };
}

/** Returns metadata from a plugin constructor. */
export function getPluginMetadata(plugin: PluginConstructor): PluginMetadata {
    if (hasMetadata(plugin)) {
        return plugin[PluginMetadataSymbol] as PluginMetadata;
    }
    throw new ErrMissingPluginMetadata(plugin);
}

type FunctionWithMetadata = Function & { [PluginMetadataSymbol]: PluginMetadata };

export function hasMetadata(ctor: Function): ctor is FunctionWithMetadata {
    return PluginMetadataSymbol in ctor;
}

export function isPlugin(ctor: Function): boolean {
    return hasMetadata(ctor);
}

/** Base class for world plugins. */
export abstract class PluginBase {
    public onPluginLoad?: () => void;
    public onPluginUnload?: (world: World) => void;
    public onAfterWorldInit?: (world: World) => void;
}

type PluginManagerInternalPluginStorageItem<T extends PluginConstructor = PluginConstructor> = {
    ctor: T;
    ctorParams: ConstructorParameters<T>;
    instance?: InstanceType<T>;
    metadata: PluginMetadata;
};

export class PluginError extends Error {
    constructor(pluginId: PluginConstructor) {
        super(`Plugin error! Plugin [${pluginId}]`);
    }
}

export class ErrNotAPlugin extends Error {
    constructor(target: Function) {
        super(`Provided class ${target.name} is not a Plugin! Every plugin must extends of PluginBase class.`);
    }
}

export class ErrMissingPluginMetadata extends Error {
    constructor(plugin: PluginConstructor) {
        super(`Provided class ${plugin.name}: Missing plugin metadata! Define plugin class with @Plugin decorator.`);
    }
}

export class ErrUnknownPlugin extends PluginError {
    constructor(pluginId: PluginConstructor) {
        super(pluginId);
        this.message = `${super.message}: Plugin not found in manager.`;
    }
}

export class ErrPluginNotInit extends PluginError {
    constructor(pluginId: PluginConstructor) {
        super(pluginId);
        this.message = `${super.message}: Plugin not initiated yet. You must use PluginsManager.build() before getting instance.`;
    }
}

export class ErrMissingPluginDependency extends PluginError {
    constructor(pluginId: PluginConstructor, missingDepId: PluginConstructor) {
        super(pluginId);
        this.message = `${super.message}: Missing required dependency [${missingDepId}]. Install it first.`;
    }
}

export class ErrDAGCycleDetectedPlugin extends Error {
    constructor() {
        super(`Cycle detected in plugin dependencies!`);
    }
}

/**
 * Installs and initializes plugins in dependency order.
 */
export class PluginsManager {
    private plugins_: Map<PluginConstructor, PluginManagerInternalPluginStorageItem> = new Map();
    private isInitiated_ = false;
    constructor(private readonly logger: Logger) { }

    /**
     * Registers a plugin constructor and optional constructor args.
     * Duplicate installs are ignored.
     */
    public install<T extends PluginConstructor>(plugin: T, ...constructorProps: ConstructorParameters<T>): void {
        if (!isPlugin(plugin))
            throw new ErrMissingPluginMetadata(plugin);

        const metadata = getPluginMetadata(plugin);

        if (this.plugins_.has(plugin))
            return;

        const entry: PluginManagerInternalPluginStorageItem<T> = {
            ctor: plugin,
            ctorParams: constructorProps,
            metadata,
        };

        this.plugins_.set(plugin, entry);
        this.logger.debug(() => `[Plugins]: Installed plugin ${metadata.name} (${metadata.version})`);
    }

    /**
     * Instantiates plugins in topological dependency order and runs `onPluginLoad`.
     *
     * @throws ErrMissingPluginDependency when declared dependency is not installed.
     * @throws ErrDAGCycleDetectedPlugin when plugin dependencies contain a cycle.
     */
    public build(): void {
        if (this.plugins_.size === 0) {
            return;
        }
        const nodes = new Map<PluginConstructor, DAGNode<PluginConstructor>>();
        for (const id of this.plugins_.keys()) {
            nodes.set(id, new DAGNode(id));
        }

        for (const [plugin, entry] of this.plugins_) {
            const node = nodes.get(plugin)!;
            const depPlugins = entry.metadata.dependencies?.plugins ?? [];

            for (const dep of depPlugins) {
                const depNode = nodes.get(dep.plugin);
                if (!depNode) {
                    throw new ErrMissingPluginDependency(plugin, dep.plugin);
                }
                depNode.vertices.push(node);
            }
        }

        let sortedNodes: DAGNode<PluginConstructor>[];
        try {
            sortedNodes = topologicalSort(nodes.values());
        } catch (e) {
            if (e instanceof ErrDAGCycleDetected) {
                throw new ErrDAGCycleDetectedPlugin();
            }
            throw e;
        }

        for (const node of sortedNodes) {
            const entry = this.plugins_.get(node.data)!;
            const { ctor, ctorParams } = entry;
            const instance = new ctor(...ctorParams) as PluginBase;
            entry.instance = instance;
            instance.onPluginLoad?.();
        }

        this.isInitiated_ = true;
        this.logger.debug(() => `[Plugins]: Plugins built successfully!`);
    }

    /**
     * @internal
     */
    public __internal__onAfterWorldInit(world: World) {
        for (const p of this.plugins_.values()) {
            p.instance?.onAfterWorldInit?.(world);
        }

    }

    /** Returns metadata for an installed plugin. */
    public getPluginMetadata(plugin: PluginConstructor): PluginMetadata {
        const entry = this.plugins_.get(plugin);
        if (!entry) throw new ErrUnknownPlugin(plugin);
        return entry.metadata;
    }

    /**
     * Returns initialized plugin instance.
     *
     * @throws ErrUnknownPlugin when plugin was not installed.
     * @throws ErrPluginNotInit when plugins are not built yet.
     */
    public getPluginInstance<T extends PluginBase>(plugin: ClassType<T>): T {
        const entry = this.plugins_.get(plugin);
        if (!entry) throw new ErrUnknownPlugin(plugin);
        if (!entry.instance) throw new ErrPluginNotInit(plugin);

        if (!this.isInitiated_) {
            throw new ErrPluginNotInit(plugin);
        }

        return entry.instance as T;
    }
};
