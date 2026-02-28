import { Bitmap } from "bitmap-index";
import type { World } from "./world";
import { ClassType } from "../../../types/class";

export class UnregisteredComponentStorageError extends Error {
    constructor(component: ClassType<any>) {
        super(`Cannot get storage for component ${component.name}. Seems like it's not registered in world.`);
    }
}

export class EntityMaskNotFoundError extends Error {
    constructor(id: number) {
        super(`Cannot find bitmask for entity [${id}]. Seems like it's not registered in the EntityManager.`)
    }
}

export class EntitiesManager {
    private id: number = 0;
    private bitmasks = new Map<number, Bitmap>();

    private nextId(): number {
        return ++this.id;
    }

    public createEntity(world: World, components: ClassType<any>[]): number {
        const id = this.nextId();
        const mask = new Bitmap(1024);

        for(const comp of components) {
            const store = world.components.getComponentStorage(comp);
            if(!store)
                throw new UnregisteredComponentStorageError(comp);
            mask.set(store.id);
        }
        this.bitmasks.set(id, mask);

        return id;
    }

    public getMask(id: number): Bitmap {
        const mask = this.bitmasks.get(id);
        if(!mask) 
            throw new EntityMaskNotFoundError(id);
        return mask;
    }

    public query(required: Bitmap): number[] {
        const result: number[] = [];

        for (const [id, mask] of this.bitmasks) {
            if (mask.containsAll(required)) {
                result.push(id);
            }
        }

        return result;
    }
};
