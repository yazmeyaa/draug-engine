/**
 * Time source abstraction for deterministic or platform-specific clocks.
 */
export interface TimeSource {
    now(): number;
}

/**
 * Frame clock that tracks delta and elapsed time in seconds.
 */
export class Clock {
    private lastTimeMs_: number;
    private ellapsedTime_: number = 0;
    private delta_: number = 0;
    private readonly time_: Time = {
        delta: 0,
        elapsed: 0,
    };

    /**
     * @param timeSource provider returning current time in milliseconds.
     */
    public constructor(
        private readonly timeSource_: TimeSource,
    ) {
        this.lastTimeMs_ = timeSource_.now();
    }


    /** Delta time in seconds produced by the last {@link tick} call. */
    public get deltaMs(): number {
        return this.delta_;
    }
    /** Total elapsed time in seconds since clock creation. */
    public get ellapsedTime(): number {
        return this.ellapsedTime_;
    }

    /**
     * Advances internal time values.
     *
     * Delta is clamped to 100ms to avoid huge simulation jumps after stalls.
     */
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

    /** Returns a readonly view with both delta and elapsed values. */
    public getTime(): Readonly<Time> {
        return this.time_;
    }
};

/** Immutable shape consumed by systems on each update. */
export type Time = {
    delta: number;
    elapsed: number;
};