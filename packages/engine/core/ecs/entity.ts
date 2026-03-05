import { Bitmap } from "bitmap-index";
import { World } from "./world";
import { ClassType } from "../../../types/class";
import { Position } from "@/packages/game/components/position";
import { Velocity } from "@/packages/game/components/velocity";

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
    private id_: number = 0;
    private nextId(): number {
        return ++this.id_;
    }

    public createEntity(world: World, components: ClassType<any>[]): number {
        const id = this.nextId();

        for (const comp of components) {
            const store = world.components.getComponentStorage(comp);
            if (!store)
                throw new UnregisteredComponentStorageError(comp);
            store.addComponent(id);
        }

        return id;
    }
};

export class EntityRef {
    constructor(
        private world: World,
        private id: number
    ) { }

    public with<
        T extends ClassType<object>[],
        Result extends { [K in keyof T]: InstanceType<T[K]> }
    >(...components: T): Result {
        return components.map(c => {
            const s = this.world.components.getComponentStorage(c);
            return s.tryGet(this.id);
        }) as Result;
    };
}