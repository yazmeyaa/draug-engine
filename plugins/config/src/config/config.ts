export class Configuration {
    private current = new Map<string, unknown>();
    private readonly pending = new Map<string, unknown>();

    public commit(): void {
        this.current = new Map(this.current);

        for (const [k, v] of this.pending) {
            this.current.set(k, v);
        }

        this.pending.clear();
    }

    public get(key: string): unknown {
        return this.current.get(key);
    };
    public set(key: string, value: unknown) {
        this.pending.set(key, value);
    }
};