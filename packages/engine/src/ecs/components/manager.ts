import { UnregisteredComponentStorageError } from "../entity";
import { ECS_DEFAULTS } from "../constant";
import { ComponentStorage } from "./component-storage";
import type { ComponentType } from "./types";
import { getComponentId } from ".";
import type { Logger } from "../../logger";
import { getComponentMetadata } from "./utils";

type RegisterComponentStorageOptions<T extends object> = {
    factory?: () => T;
}

type RegisterComponentOptions<T extends object> = RegisterComponentStorageOptions<T>

export class ComponentAlreadyRegisteredError extends Error {
    constructor(component: ComponentType) {
        super(`Component ${component.name} already registered!`)
    }
}

export class ComponentsManager {
    private readonly storages_ = new Map<ComponentType, ComponentStorage<any>>();
    private currId_ = 0;
    private nextId(): number {
        return ++this.currId_;
    }

    constructor(
        private readonly logger: Logger,
        private maxEntityCount: number = ECS_DEFAULTS.MAX_ENTITY_COUNT
    ) { }

    /**
     * Registers a component storage if not registered yet.
     *
     * Returns existing storage when called repeatedly with the same component type.
     */
    public register<T extends object>(
        component: ComponentType<T>,
        opts?: RegisterComponentOptions<T>
    ): ComponentStorage<T> {
        if (this.storages_.has(component))
            return this.storages_.get(component)!;

        const store: ComponentStorage<T> = this.createComponentStore(component, opts);

        this.storages_.set(component, store);
        const meta = getComponentMetadata(component);
        this.logger.debug(() => `[Components]: Registered component "${meta.name}"`);
        return store;
    }

    private createComponentStore<T extends object>(component: ComponentType<T>, opts?: RegisterComponentOptions<T>): ComponentStorage<T> {
        const factory = opts?.factory ?? ((...args: any[]) => new component(...args));
        const store = new ComponentStorage(this.maxEntityCount, factory, component);
        store._internalSetId(this.nextId());
        return store;
    }


    /**
     * Returns storage for a component type.
     *
     * @throws UnregisteredComponentStorageError when the storage does not exist.
     */
    public getStorage<T extends object>(component: ComponentType<T>): ComponentStorage<T> {
        const store = this.storages_.get(component);
        if (store === undefined)
            throw new UnregisteredComponentStorageError(component);

        return store;
    }

    /** Returns component type id assigned by the decorator registry. */
    public getComponentId(ctor: ComponentType): number {
        return getComponentId(ctor);
    }
}