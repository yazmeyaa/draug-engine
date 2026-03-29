import { UnregisteredComponentStorageError } from "../entity";
import { ECS_DEFAULTS } from "../constant";
import { ComponentStorage } from "./component-storage";
import type { ComponentType, IStorage } from "./types";
import { SingletonStorage } from "./singleton-storage";

export enum ComponentStorageType {
    COMPONENT_STORAGE = 1,
    SINGLETON_STORAGE = 2,
};

type RegisterSingletoneComponentOptions<T extends object> = {
    storageType: ComponentStorageType.SINGLETON_STORAGE;
    factory: () => T;
}
type RegisterComponentStorageOptions<T extends object> = {
    storageType: ComponentStorageType.COMPONENT_STORAGE;
    factory?: () => T;
}

type RegisterComponentOptions<T extends object> = RegisterSingletoneComponentOptions<T> | RegisterComponentStorageOptions<T>

export class ComponentAlreadyRegisteredError extends Error {
    constructor(component: ComponentType) {
        super(`Component ${component.name} already registered!`)
    }
}

export class ComponentsManager {
    private readonly storages_ = new Map<ComponentType, IStorage<any>>();
    private currId_ = 0;
    private nextId(): number {
        return ++this.currId_;
    }

    constructor(
        private maxEntityCount: number = ECS_DEFAULTS.MAX_ENTITY_COUNT
    ) { }

    public register<T extends object>(
        component: ComponentType<T>,
        opts?: RegisterComponentOptions<T>
    ): IStorage<T> {
        if (this.storages_.has(component))
            return this.storages_.get(component)!;

        let store: IStorage<T>;

        switch (opts?.storageType) {
            case ComponentStorageType.SINGLETON_STORAGE:
                store = this.createSingletonStore(opts);
                break;
            case ComponentStorageType.COMPONENT_STORAGE:
                store = this.createComponentStore(component, opts);
                break;
            default: 
                store = this.createComponentStore(component, opts);
                break;
        }

        this.storages_.set(component, store);
        return store;
    }

    private createComponentStore<T extends object>(component: ComponentType<T>, opts?: RegisterComponentOptions<T>): IStorage<T> {
        const factory = opts?.factory ?? ((...args: any[]) => new component(...args));
        const store = new ComponentStorage(this.maxEntityCount, factory);
        store._internalSetId(this.nextId());
        return store;
    }

    private createSingletonStore<T extends object>(opts?: RegisterSingletoneComponentOptions<T>): IStorage<T> {
        if(!opts?.factory) {
            throw new Error("For singletone storage provide factory is required!")
        }
        return new SingletonStorage(opts.factory);
    }

    public getStorage<T extends object>(component: ComponentType<T>): IStorage<T> {
        const store = this.storages_.get(component);
        if (store === undefined)
            throw new UnregisteredComponentStorageError(component);

        return store;
    }
}