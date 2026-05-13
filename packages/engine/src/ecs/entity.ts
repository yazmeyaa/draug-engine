import type { ComponentType } from "./components";
import { World } from "./world";

export type EntityID = number;

export class UnregisteredComponentStorageError extends Error {
    constructor(component: ComponentType) {
        super(`Cannot get storage for component ${component.name}. Seems like it's not registered in world.`);
    }
}

export class EntityMaskNotFoundError extends Error {
    constructor(id: EntityID) {
        super(`Cannot find bitmask for entity [${id}]. Seems like it's not registered in the EntityManager.`)
    }
}

export class EntitiesManager {
    private id_: EntityID = 0;
    private nextId(): EntityID {
        return ++this.id_;
    }

    public create(): EntityID {
        return this.nextId();
    }
};

export class EntityRef {
    constructor(
        private world: World,
        public id: EntityID,
    ) { }

    public with<
        T extends ComponentType[],
        Result extends { [K in keyof T]: InstanceType<T[K]> }
    >(...components: T): Result {
        return components.map(c => {
            const s = this.world.components.getStorage(c);
            return s.tryGet(this.id);
        }) as Result;
    };
}