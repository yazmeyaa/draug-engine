import { EntityType } from "../network/generated/server";

type PlayerAction = {
    movement: {dx: number; dy: number};
};

export class PlayerActions {
    public data = new Map<EntityType, PlayerAction>()
};