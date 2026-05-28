const OPEN_CLASS = "is-open";

export class DebugDrawer {
    private open_ = false;

    constructor(
        private readonly shell_: HTMLElement,
        private readonly toggle_: HTMLButtonElement,
    ) {
        this.toggle_.addEventListener("click", () => this.toggle());
        this.syncAria();
    }

    public toggle(): void {
        this.open_ = !this.open_;
        this.shell_.classList.toggle(OPEN_CLASS, this.open_);
        this.syncAria();
    }

    private syncAria(): void {
        this.toggle_.setAttribute("aria-expanded", String(this.open_));
        this.toggle_.setAttribute("aria-label", this.open_ ? "Hide debug menu" : "Show debug menu");
        this.toggle_.title = this.open_ ? "Hide debug" : "Show debug";
        this.toggle_.textContent = this.open_ ? "◀" : "DBG";
    }
}
