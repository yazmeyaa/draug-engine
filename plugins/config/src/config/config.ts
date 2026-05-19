export class Configuration {
    private readonly current = new Map<string, unknown>();
    private readonly pending = new Map<string, unknown>();

    public commit(): void {
        for (const [k, v] of this.pending) {
            this.current.set(k, v);
        }

        this.pending.clear();
    }

    public get<T>(key: string): T | null {
        return this.current.get(key) as T ?? null;
    };

    public set(key: string, value: unknown) {
        this.pending.set(key, value);
    }
};