import {
    Clock,
    Engine,
    LogLevel,
    Loop,
    World,
    type TimeSource as TS,
} from "@draug/engine";
import { RenderView } from "./render/renderer";
import { Camera } from "./render/types";
import { Renderable } from "./components/renderable";
import { ImageAsset } from "./assets/image";
import { HTMLLogger } from "./logger/html-logger";
import { Position, Rotation } from "@draug/engine/std-components";

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

export class BrowserGame {
    private readonly engine_: Engine;
    private readonly renderView: RenderView;

    public get world(): World {
        return this.engine_.world;
    }
    public get engine(): Engine {
        return this.engine_;
    }
    constructor(
        ctx: CanvasRenderingContext2D,
        logsContainer: HTMLElement,
        private onWorldUpdate?: (world: World) => void,
    ) {
        const clock = new Clock(new TimeSource());
        const loop = new Loop(clock, () => {
            this.world.update(clock);
            this.onWorldUpdate?.(this.world);
            this.render(ctx);
        }, window.requestAnimationFrame.bind(window));

        const engine = new Engine({ loop, maxEntityCount: 2048 });
        const logger = new HTMLLogger(logsContainer, engine, LogLevel.Debug);
        this.engine_ = engine

        logger.debug(() => "Test DEBUG log");
        logger.info(() => "Test INFO log");
        logger.warn(() => "Test WARN log");
        logger.error(() => "Test ERROR log");

        setInterval(() => {
            logger.debug(() => 'tick')
        }, 1000);

        const camera = this.world.resources.insert(Camera, new Camera(0, 0, 1.2, 800, 600));
        this.renderView = new RenderView(this.world, camera)
    };

    private render(ctx: CanvasRenderingContext2D): void {
        const world = this.world;
        const renderView = this.renderView;
        const camera = world.resources.get(Camera);

        const rStore = world.components.getStorage(Renderable);
        const snapshot = renderView.snapshot().sort((a, b) => a.zIndex - b.zIndex);

        ctx.clearRect(0, 0, camera.width, camera.height);

        const tStore = world.components.getStorage(Position);
        const rotStore = world.components.getStorage(Rotation);
        for (const entry of snapshot) {
            const r = rStore.tryGet(entry.entityId);
            const data = this.engine.assets.tryGetStorage(ImageAsset).tryGet(r.spriteId).getData();
            const t = tStore.tryGet(entry.entityId);

            ctx.save();

            const rot = rotStore.get(entry.entityId);
            if (rot) {
                const rad = rot.value.mulScalar(Math.PI / 180);
                ctx.rotate(rad.x);
            }

            ctx.translate(entry.x, entry.y);
            ctx.drawImage(data, -50, -50, 100, 100);

            ctx.font = '24px Arial'
            ctx.fillStyle = 'white'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`(${t.value.x.toFixed(1)}, ${t.value.y.toFixed(1)})`, 0, -75)

            ctx.restore();
        }
    }

    public start(): void {
        this.engine_.start();
    };
};