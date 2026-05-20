import {
    Clock,
    Engine,
    Loop,
    World,
    type TimeSource as TS,
} from "@draug/engine";
import { RenderView } from "./render/renderer";
import { Camera } from "./render/types";
import { Renderable } from "./components/renderable";
import { Transform } from "./components/transform";
import { ImageAsset } from "./assets/image";

class TimeSource implements TS {
    public now(): number {
        return performance.now();
    }
}

export class BrowserGame {
    private readonly engine_: Engine;
    private readonly world_ = new World();
    private readonly renderView: RenderView;
    
    public get world(): World {
        return this.world_;
    }
    public get engine(): Engine {
        return this.engine_;
    }
    constructor(
        ctx: CanvasRenderingContext2D,
        private onWorldUpdate?: (world: World) => void,
    ) {
        const clock = new Clock(new TimeSource());
        const loop = new Loop(this.world, clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
            this.render(ctx);
        }, window.requestAnimationFrame.bind(window));
        this.engine_ = new Engine({ loop });

        const camera = this.world.resources.insert(Camera, new Camera(0, 0, 1.2, 800, 600));
        this.renderView = new RenderView(this.world_, camera)
    };

    private render(ctx: CanvasRenderingContext2D): void {
        const world = this.world;
        const renderView = this.renderView;
        const camera = world.resources.get(Camera);

        const rStore = world.components.getStorage(Renderable);
        const snapshot = renderView.snapshot().sort((a, b) => a.zIndex - b.zIndex);

        ctx.clearRect(0, 0, camera.width, camera.height);

        const tStore = world.components.getStorage(Transform);
        for (const entry of snapshot) {
            const r = rStore.tryGet(entry.entityId);
            const data = this.engine.assets.tryGetStorage(ImageAsset).tryGet(r.spriteId).getData();
            const t = tStore.tryGet(entry.entityId);

            ctx.save();

            const rad = t.rotate * Math.PI / 180;

            ctx.translate(entry.x, entry.y);
            if (entry.entityId === 1)
                console.log(entry.entityId, entry.x, entry.y)
            ctx.rotate(rad);
            ctx.drawImage(data, -50, -50, 100, 100);

            ctx.font = '24px Arial'
            ctx.fillStyle = 'white'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`(${t.x.toFixed(1)}, ${t.y.toFixed(1)})`, 0, -75)

            ctx.restore();
        }
    }

    public start(): void {
        this.engine_.start();
    };
};