import type { Loop } from "./loop";

export class Runtime {
    constructor(
        private readonly loop: Loop,
    ) { };
    public run(): void {
        this.loop.start()
    }
};  