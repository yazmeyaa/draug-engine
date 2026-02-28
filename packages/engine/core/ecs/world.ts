import { ComponentsManager } from "./component";
import { EntitiesManager } from "./entity";
import { SystemsManager } from "./system";

export class World {
    public readonly entities = new EntitiesManager();
    public readonly components = new ComponentsManager();
    public readonly systems = new SystemsManager();
};
 