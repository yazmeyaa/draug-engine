import { Resource } from "@draug/engine";

@Resource({ name: "GameSettings" })
export class GameSettingsResource {
    /** When true, the bird ignores pipe hits and world bounds. */
    public disableBirdCollision = false;
}
