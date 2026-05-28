import type { ComponentType } from "../components";
import { type EntityID } from "./entity";

export class ErrEntityAlreadyExist extends Error {
    constructor(id: EntityID) {
        super(`Entity with ID [${id}] already exist in EntityCompositionIndex.`);
    }
}
export class ErrNoComponentSetForEntity extends Error {
    constructor(id: EntityID) {
        super(`Entity [${id}] does not exist in EntityCompositionIndex. Use EntityCompositionIndex.addEntity(id: EntityID) before trying to get ComponentsSet.`)
    }
}

export class EntityCompositionIndex {
    private entityComponentsMap_ = new Map<EntityID, Set<ComponentType>>();

    private getSet(id: EntityID): Set<ComponentType> {
        const set = this.entityComponentsMap_.get(id);

        if (!set)
            throw new ErrNoComponentSetForEntity(id);

        return set;
    }

    public addComponent(id: EntityID, component: ComponentType): void {
        const set = this.getSet(id);
        set.add(component);
    }

    public removeComponent(id: EntityID, component: ComponentType): void {
        const set = this.getSet(id);
        set.delete(component);
    }

    public getComponents(id: EntityID): ReadonlySet<ComponentType> {
        return this.getSet(id);
    }

    public addEntity(id: EntityID): void {
        if (this.entityComponentsMap_.has(id))
            throw new ErrEntityAlreadyExist(id);
        this.entityComponentsMap_.set(id, new Set());
    }

    public removeEntity(id: EntityID): void {
        this.entityComponentsMap_.delete(id);
    }

    public getEntityIds(): EntityID[] {
        return [...this.entityComponentsMap_.keys()];
    }
}