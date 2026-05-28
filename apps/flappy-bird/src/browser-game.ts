import {
    Clock,
    Engine,
    LogLevel,
    Loop,
    World,
    type TimeSource as TS,
} from "@draug/engine";
import { worldSizeToScreen, worldToScreen } from "./render/camera-transform";
import { drawHitboxes } from "./render/draw-hitboxes";
import { RenderView } from "./render/renderer";
import { Camera } from "./render/types";
import { ColliderRectangle } from "./components/collider";
import { Renderable } from "./components/renderable";
import { ImageAsset } from "./assets/image";
import { HTMLLogger } from "./logger/html-logger";
import { Position, Rotation } from "@draug/engine/std-components";
import { GameStateResource, GameState } from "./resources/game-state";
import { FlappyTag } from "./components/flappy-tag";
import { PipeTag } from "./components/pipe-tag";
import { PipeGapId } from "./components/pipe-gap-id";
import { GameActions } from "./resources/actions";
import { PipeSpawnerResource } from "./resources/pipe-spawner";
import { WorldPhysicsResource } from "./resources/physics";

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
    ) {
        const clock = new Clock(new TimeSource());
        const loop = new Loop(clock, () => {
            this.world.update(clock);
            this.render(ctx);
        }, window.requestAnimationFrame.bind(window));

        const engineHolder: { current: Engine | null } = { current: null };
        const logger = new HTMLLogger(
            logsContainer,
            { getTick: () => engineHolder.current?.getTick() ?? 0 },
            LogLevel.Debug,
        );
        const engine = new Engine({ loop, maxEntityCount: 2048, logger });
        engineHolder.current = engine;
        this.engine_ = engine;
        
        const camera = this.world.resources.insert(Camera, new Camera(0, 0, 1.4, 800, 600));
        this.setupWorld();
        this.renderView = new RenderView(this.world, camera);
    }

    private setupWorld(): void {
        this.world.components.register(FlappyTag);
        this.world.components.register(PipeTag);
        this.world.components.register(PipeGapId);
        this.world.components.register(Renderable);

        this.world.resources.insert(GameActions, new GameActions());
        this.world.resources.insert(GameStateResource, new GameStateResource());
        this.world.resources.insert(PipeSpawnerResource, new PipeSpawnerResource());
        this.world.resources.insert(WorldPhysicsResource, new WorldPhysicsResource());
    }

    private render(ctx: CanvasRenderingContext2D): void {
        const world = this.world;
        const renderView = this.renderView;
        const camera = world.resources.get(Camera);
        const gameState = world.resources.get(GameStateResource);

        const rStore = world.components.getStorage(Renderable);
        const positionStore = world.components.getStorage(Position);
        const colliderStore = world.components.getStorage(ColliderRectangle);
        const snapshot = renderView.snapshot().sort((a, b) => a.zIndex - b.zIndex);

        ctx.clearRect(0, 0, camera.width, camera.height);

        const rotStore = world.components.getStorage(Rotation);
        for (const entry of snapshot) {
            const r = rStore.tryGet(entry.entityId);
            const data = this.engine.assets.tryGetStorage(ImageAsset).tryGet(r.spriteId).getData();
            const collider = colliderStore.tryGet(entry.entityId);
            const position = positionStore.tryGet(entry.entityId);

            const topLeft = worldToScreen(
                camera,
                position.value.x + collider.offsetX,
                position.value.y + collider.offsetY,
            );
            const w = worldSizeToScreen(camera, collider.width);
            const h = worldSizeToScreen(camera, collider.height);

            ctx.save();

            const rot = rotStore.get(entry.entityId);
            if (rot) {
                const rad = rot.value.mulScalar(Math.PI / 180);
                ctx.translate(topLeft.x + w / 2, topLeft.y + h / 2);
                ctx.rotate(rad.x);
                ctx.drawImage(data, -w / 2, -h / 2, w, h);
            } else {
                ctx.drawImage(data, topLeft.x, topLeft.y, w, h);
            }

            ctx.restore();
        }

        drawHitboxes(ctx, world, camera);
        this.drawHud(ctx, camera, gameState);
    }

    private drawHud(
        ctx: CanvasRenderingContext2D,
        camera: Camera,
        gameState: GameStateResource,
    ): void {
        ctx.font = "bold 32px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`Score: ${gameState.score}`, 20, 20);

        if (gameState.state === GameState.Start) {
            ctx.font = "bold 48px Arial";
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("FLAPPY BIRD", camera.width / 2, camera.height / 2 - 60);

            ctx.font = "24px Arial";
            ctx.fillText("Press SPACE to start", camera.width / 2, camera.height / 2 + 40);
            return;
        }

        if (gameState.state === GameState.GameOver) {
            ctx.font = "bold 48px Arial";
            ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GAME OVER", camera.width / 2, camera.height / 2 - 60);

            ctx.font = "28px Arial";
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillText(`Final Score: ${gameState.score}`, camera.width / 2, camera.height / 2);

            ctx.font = "20px Arial";
            ctx.fillText("Press SPACE to restart", camera.width / 2, camera.height / 2 + 60);
        }
    }

    public start(): void {
        this.engine_.start();
    }
}
