import { BrowserGame } from "./browser";
import { World } from "@/packages/engine/core/ecs/world";
import { AttractorObject } from "@/packages/game/components/attrcator";
import { Position } from "@/packages/game/components/position";
import { Renderable } from "@/packages/game/components/renderable";
import { Velocity } from "@/packages/game/components/velocity";
import { MovementSystem } from "@/packages/game/systems/movement";
import { Camera, RenderingSystem } from "@/packages/game/systems/rendering";
import { AttractionSystem } from "@/packages/game/systems/world-attraction";

const world = new World();
const pStore = world.components.registerComponent(Position);
const vStore = world.components.registerComponent(Velocity);
world.components.registerComponent(Renderable);
world.components.registerComponent(AttractorObject, { factory: () => ({ mass: 40 }) });

const msSys = new MovementSystem();
const aSys = new AttractionSystem();
const renderingSystem = new RenderingSystem();
world.systems.register(msSys, world);
world.systems.register(aSys, world);
world.systems.register(renderingSystem, world);
world.systems.build();

const attractorId = world.entities.createEntity(world, [Position, Velocity, Renderable, AttractorObject]);
const aPos = pStore.tryGet(attractorId);
aPos.x = 100;
aPos.y = 20;

for (let i = 0; i < 100; i++) {
  const id = world.entities.createEntity(world, [Position, Velocity, Renderable, AttractorObject]);
  const pos = pStore.tryGet(id);
  pos.x = 400 - Math.random() * 800;
  pos.y = 300 - Math.random() * 600;
  const vel = vStore.tryGet(id);
  vel.vx = (Math.random() - 0.5) * 100;
  vel.vy = (Math.random() - 0.5) * 100;
}


let step = 0;
let fps = 0;
let lastTime = performance.now();
let frameCount = 0;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const camera = {
  x: 0,
  y: 0,
  zoom: 1.2,
  width: 800,
  height: 600,
} satisfies Camera;

function resizeCanvas() {
  const dpr = window.devicePixelRatio ?? 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  camera.width = w;
  camera.height = h;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function worldToScreen(wx: number, wy: number): [number, number] {
  const sx = (wx - camera.x) * camera.zoom + camera.width / 2;
  const sy = (wy - camera.y) * camera.zoom + camera.height / 2;
  return [sx, sy];
}

const RADIUS_OBJECT = 6;
const RADIUS_ATTRACTOR = 12;

const debugPanel = document.getElementById("debug-panel")!;

const game = new BrowserGame(world, (world) => {
  step += 1;
  frameCount++;
  
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  
  if (deltaTime >= 1000) {
    fps = Math.round((frameCount * 1000) / deltaTime);
    frameCount = 0;
    lastTime = currentTime;
  }
  
  world.systems.update(world);

  const aPos = pStore.tryGet(attractorId);
  const ids = world.query({ components: [Position, Velocity] });
  const snapshot = renderingSystem.getSnapshot(world, camera);
  const attractorIds = world.query({ components: [Position, AttractorObject] });

  // Draw to canvas
  ctx.clearRect(0, 0, camera.width, camera.height);
  for (const id of attractorIds) {
    const p = pStore.tryGet(id);
    const [sx, sy] = worldToScreen(p.x, p.y);
    ctx.beginPath();
    ctx.arc(sx, sy, RADIUS_ATTRACTOR, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
  }
  for (const entry of snapshot) {
    ctx.beginPath();
    ctx.arc(entry.x, entry.y, RADIUS_OBJECT, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
  }

  const entitiesHtml = [...ids]
    .map((id) => {
      const pos = pStore.tryGet(id);
      const vel = vStore.tryGet(id);
      return `<div class="row"><span class="key">Entity ${id}</span><span class="val">x=${pos.x.toFixed(2)} y=${pos.y.toFixed(2)} vx=${vel.vx.toFixed(2)} vy=${vel.vy.toFixed(2)}</span></div>`;
    })
    .join("");

  const renderItemsHtml = snapshot
    .map((e) => `<div class="row"><span class="key">#${e.entityId}</span><span class="val">x=${e.x.toFixed(3)} y=${e.y.toFixed(3)}</span></div>`)
    .join("");

  debugPanel.innerHTML = `
    <section><h3>Step ${step}</h3></section>
    <section>
      <h3>Performance</h3>
      <div class="row"><span class="key">FPS</span><span class="val">${fps}</span></div>
    </section>
    <section>
      <h3>Attractor</h3>
      <div class="row"><span class="key">Position</span><span class="val">x=${aPos.x.toFixed(2)} y=${aPos.y.toFixed(2)}</span></div>
    </section>
    <section>
      <h3>Entities</h3>
      ${entitiesHtml || "<div class=\"key\">—</div>"}
    </section>
    <section>
      <h3>Camera</h3>
      <div class="row"><span class="key">Center</span><span class="val">${camera.x.toFixed(3)}, ${camera.y.toFixed(3)}</span></div>
      <div class="row"><span class="key">Size</span><span class="val">${camera.width} × ${camera.height}</span></div>
      <div class="row"><span class="key">Zoom</span><span class="val">${camera.zoom}</span></div>
    </section>
    <section>
      <h3>Rendering</h3>
      ${renderItemsHtml || "<div class=\"key\">—</div>"}
    </section>
  `;
});
game.start();
