export interface TimeSource {
    now(): number;
}

export class Clock {
    private lastTimeMs_: number;
    private ellapsedTime_: number = 0;
    private delta_: number = 0;
    private readonly time_: Time = {
        delta: 0,
        elapsed: 0,
    };

    public constructor(
        private readonly timeSource_: TimeSource,
    ) {
        this.lastTimeMs_ = timeSource_.now();
    }


    public get deltaMs(): number {
        return this.delta_;
    }
    public get ellapsedTime(): number {
        return this.ellapsedTime_;
    }

    public tick(): void {
        const now = this.timeSource_.now();
        const dt = Math.min(now - this.lastTimeMs_, 100);
        this.delta_ =
            this.time_.delta =
            dt / 1000;
        this.ellapsedTime_ =
            this.time_.elapsed +=
            dt / 1000;
        this.lastTimeMs_ = now;
    }

    public getTime(): Readonly<Time> {
        return this.time_;
    }
};

export type Time = {
    delta: number;
    elapsed: number;
};