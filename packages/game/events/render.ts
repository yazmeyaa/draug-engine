import { createEventKey } from "@amber-game/engine/ecs/events-buffer";
import type { RenderingSnapshotEntry } from "../systems/rendering";

const RENDER_EVENT_KEY = createEventKey<RenderingSnapshotEntry>("render_ready");
