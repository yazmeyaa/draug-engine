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

    public getId(): EntityID {
        return this.nextId();
    }

    public createEntity(world: World, components: ComponentType[]): EntityID {
        const id = this.nextId();

        for (const comp of components) {
            const store = world.components.getStorage(comp);
            if (!store)
                throw new UnregisteredComponentStorageError(comp);
            store.add(id);
        }

        return id;
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