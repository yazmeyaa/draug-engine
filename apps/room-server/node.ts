import { World } from "@/packages/engine/core/ecs/world";
import { Clock } from "@/packages/engine/runtime/clock";
import { GameLoop } from "@/packages/engine/runtime/game-loop";
import { AttractorObject } from "@/packages/game/components/attrcator";
import { Position } from "@/packages/game/components/position";
import { Renderable } from "@/packages/game/components/renderable";
import { Velocity } from "@/packages/game/components/velocity";
import { MovementSystem } from "@/packages/game/systems/movement";
import { Camera, RenderingSystem } from "@/packages/game/systems/rendering";
import { AttractionSystem } from "@/packages/game/systems/world-attraction";

export class NodeGame {
    constructor(private world: World, private onWorldUpdate?: (world: World) => void) {}

    start() {
        const clock = new Clock();
        const loop = new GameLoop(clock, (dt) => {
            this.world.update(dt);
            this.onWorldUpdate?.(this.world);
        });
        loop.start((cb) => globalThis.setTimeout(cb, 16));
    }
}

const world = new World();
const pStore = world.components.registerComponent(Position);
const vStore = world.components.registerComponent(Velocity);
world.components.registerComponent(AttractorObject);
world.components.registerComponent(Renderable);

const msSys = new MovementSystem("movement");
const aSys = new AttractionSystem("attraction");
const renderingSystem = new RenderingSystem(RenderingSystem.name, [MovementSystem]);
world.systems.register(msSys, world);
world.systems.register(aSys, world);
world.systems.register(renderingSystem, world);
world.systems.build();  

const attractorId = world.entities.createEntity(world, [Position, AttractorObject]);
const aPos = pStore.tryGet(attractorId);
aPos.x = 100;
aPos.y = 20;

for (let i = 0; i < 5; i++) {
    const id = world.entities.createEntity(world, [Position, Velocity, Renderable]);
    const pos = pStore.tryGet(id);
    pos.x = i * 10;
    pos.y = i * 5;
    const vel = vStore.tryGet(id);
    vel.vx = 0;
    vel.vy = 0;
}

let step = 0;
const camera = {
    x: 0,
    y: 0,
    zoom: 1.2,
    width: 1920,
    height: 1080
} satisfies Camera;

const game = new NodeGame(world, (world) => {
    step += 1;
    console.clear();
    console.log(`Step ${step}`);
    const aPos = pStore.tryGet(attractorId);
    console.log(`Attractor position: x=${aPos.x.toFixed(2)}, y=${aPos.y.toFixed(2)}`)
    const ids = world.query({ components: [Position, Velocity] })
    for (const id of ids) {
        const pos = pStore.tryGet(id);
        const vel = vStore.tryGet(id);
        console.log(`Entity ${id}: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, vx=${vel.vx.toFixed(2)}, vy=${vel.vy.toFixed(2)}`);
    }

    console.log("\n---")
    console.log(`Camera info\n\nCenterX=${camera.x.toFixed(3)}\nCenterY=${camera.y.toFixed(3)}\nWidth=${camera.width}\nHeight=${camera.height}\nZoom=${camera.zoom}`)
    console.log("---\n")

    const snapshot = renderingSystem.getSnapshot(world, camera);
    for(const entry of snapshot) {
        console.log(`Rendering item: entityID=${entry.entityId}, x=${entry.x.toFixed(3)}, y=${entry.y.toFixed(3)}`)
    } 

    console.log("---");
});
game.start();