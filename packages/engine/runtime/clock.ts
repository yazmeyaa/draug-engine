export class Clock {
    private lastTimeMs_: number = performance.now();
    private elapsedTime_: number = 0;
    private dt_: number = 0;
    public get dt(): number {
        return this.dt_;
    }
    public get ellapsedTime(): number {
        return this.elapsedTime_;
    }

    public tick(): void {
        const now = performance.now();
        const dt = now - this.lastTimeMs_;
        this.dt_ = dt;
        this.elapsedTime_ += dt;
        this.lastTimeMs_ = now;
    }
};