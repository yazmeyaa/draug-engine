import { Resource, type EntityID } from "@draug/engine";

export enum GameState {
    Start = "start",
    Playing = "playing",
    GameOver = "gameOver",
}

@Resource({ name: "GameStateResource" })
export class GameStateResource {
    constructor(
        public state: GameState = GameState.Start,
        public score: number = 0,
        public scoredGapIds: Set<number> = new Set(),
        public birdId: EntityID = 0,
    ) {}
}
