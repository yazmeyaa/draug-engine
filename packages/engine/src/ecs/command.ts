import type { Logger } from "../logger";
import type { ComponentType } from "./components";
import { getComponentMetadata } from "./components/utils";
import { World } from "./world";

export type WorldCommand = (world: World) => void;
export type ComponentInitFn<C extends ComponentType> =
    (component: InstanceType<C>) => void;

export type CreateEntityComponentEntry<T extends ComponentType = ComponentType> =
    T extends unknown ? [T, ComponentInitFn<T>] : never;

export function entry<T extends ComponentType>(
    component: T,
    init: ComponentInitFn<T> = () => { }
): CreateEntityComponentEntry {
    return [component, init as ComponentInitFn<ComponentType>];
}

export class Commands {
    private readonly commandsQueue_: WorldCommand[] = [];

    constructor(
        private readonly world: World,
        private readonly logger: Logger,
    ) { }

    public add(cmd: WorldCommand): void {
        this.commandsQueue_.push(cmd);
    };
    public flush(world: World): void {
        for (const cmd of this.commandsQueue_)
            cmd(world);
        this.commandsQueue_.length = 0;
    }
    public createEntity(...entries: CreateEntityComponentEntry[]): number {
        const id = this.world.entities.create();

        const cmd = (world: World) => {
            for (const [cls, initFn] of entries) {
                world.addComponent(id, cls, initFn);
            }
        }
        this.add(cmd);
        this.logger.debug(() => {
            const components = entries.map(x => getComponentMetadata(x[0]).name).join(", ")
            return `[Commands.createEntity]: Created new entity with ID ${id}. Linked components: [${components}]`;
        });
        return id;
    }
};
