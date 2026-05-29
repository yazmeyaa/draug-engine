import type { Logger } from "../../logger";
import type { ComponentType } from "../components";
import { getComponentMetadata } from "../components/utils";

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
    private available_: EntityID[] = [];

    constructor(private readonly logger: Logger) { }

    private nextId(): EntityID {
        return ++this.id_;
    }

    public create(): EntityID {
        if (this.available_.length > 0)
            return this.available_.pop()!;
        return this.nextId()
    }

    public destroy(id: EntityID): void {
        this.available_.push(id);
    }
};
