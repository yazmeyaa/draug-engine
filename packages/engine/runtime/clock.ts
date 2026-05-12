export interface TimeSource {
    now(): number;
}

export class Clock {
    private lastTimeMs_: number;
    private elapsedTime_: number = 0;
    private dt_: number = 0;

    public constructor(
        private readonly timeSource_: TimeSource,
    ) {
        this.lastTimeMs_ = timeSource_.now();
    }


    public get dt(): number {
        return this.dt_;
    }
    public get ellapsedTime(): number {
        return this.elapsedTime_;
    }

    public tick(): void {
        const now = this.timeSource_.now();
        const dt = now - this.lastTimeMs_;
        this.dt_ = dt;
        this.elapsedTime_ += dt;
        this.lastTimeMs_ = now;
    }
};