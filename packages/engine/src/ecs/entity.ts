import type { Logger } from "../logger";
import type { ComponentType } from "./components";
import { getComponentMetadata } from "./components/utils";
import { World } from "./world";

export type EntityID = number;

export class UnregisteredComponentStorageError extends Error {
    constructor(component: ComponentType) {
        const meta = getComponentMetadata(component);
        super(`Cannot get storage for component ${meta.name}. Seems like it's not registered in world.`);
    }
}

export class EntityMaskNotFoundError extends Error {
    constructor(id: EntityID) {
        super(`Cannot find bitmask for entity [${id}]. Seems like it's not registered in the EntityManager.`)
    }
}

export class EntitiesManager {
    private id_: EntityID = 0;

    constructor(private readonly logger: Logger) { }

    private nextId(): EntityID {
        return ++this.id_;
    }

    public create(): EntityID {
        const id = this.nextId();
        this.logger.debug(() => `[Entities]: Created new entity with ID ${id}`);
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