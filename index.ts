import { World } from "./packages/engine/core/ecs/world";
import { AttractorObject } from "./packages/game/components/attrcator";
import { Position } from "./packages/game/components/position";
import { Velocity } from "./packages/game/components/velocity";
import { MovementSystem } from "./packages/game/systems/movement";
import { AttractionSystem } from "./packages/game/systems/world-attraction";

const world = new World();
const pStore = world.components.registerComponent(Position);
const vStore = world.components.registerComponent(Velocity);
world.components.registerComponent(AttractorObject, { factory: () => ({ mass: 5 }) });
const msSys = new MovementSystem("movement");
const aSys = new AttractionSystem("attraction");
world.systems.register(msSys, world);
world.systems.register(aSys, world);
world.systems.build();


const attractorId = world.entities.createEntity(world, [Position, AttractorObject]);
const aPos = pStore.tryGet(attractorId);
aPos.x = 100;
aPos.y = 20;

for (let i = 0; i < 5; i++) {
    const id = world.entities.createEntity(world, [Position, Velocity]);
    console.log({ id });
    const pos = pStore.tryGet(id);
    pos.x = i * 10;
    pos.y = i * 5;
    const vel = vStore.tryGet(id);
    vel.vx = 0;
    vel.vy = 0;
}


let step = 0;
setInterval(() => {
    step += 1;
    console.clear();
    console.log(`Step ${step}`);
    world.systems.update(world);
    const aPos = pStore.tryGet(attractorId);
    console.log(`Attractor position: x=${aPos.x.toFixed(2)}, y=${aPos.y.toFixed(2)}`)
    const ids = world.query({ components: [Position, Velocity] })
    for (const id of ids) {
        const pos = pStore.tryGet(id);
        const vel = vStore.tryGet(id);
        console.log(`Entity ${id}: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, vx=${vel.vx.toFixed(2)}, vy=${vel.vy.toFixed(2)}`);
    }
    console.log("---");
}, 16)