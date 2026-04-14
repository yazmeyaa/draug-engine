import type { World } from "./world";

export type WorldCommand = (world: World) => void;

export class Commands {
    private readonly commandsQueue_: WorldCommand[] = [];
    public add(cmd: WorldCommand): void {
        this.commandsQueue_.push(cmd);
    };
    public flush(world: World): void {
        for (const cmd of this.commandsQueue_)
            cmd(world);
        this.commandsQueue_.length = 0;
    }
};