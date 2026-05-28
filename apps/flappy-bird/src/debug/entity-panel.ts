import type { EntityID, World } from "@draug/engine";

export class EntityDebugPanel {
    private readonly countEl_: HTMLElement;
    private readonly listEl_: HTMLElement;

    constructor(root: HTMLElement) {
        const heading = document.createElement("h3");
        heading.textContent = "Active entities";
        root.appendChild(heading);

        const countRow = document.createElement("div");
        countRow.className = "row";
        const countKey = document.createElement("span");
        countKey.className = "key";
        countKey.textContent = "Count";
        this.countEl_ = document.createElement("span");
        this.countEl_.className = "val";
        this.countEl_.textContent = "0";
        countRow.append(countKey, this.countEl_);
        root.appendChild(countRow);

        this.listEl_ = document.createElement("ul");
        this.listEl_.className = "entity-ids";
        root.appendChild(this.listEl_);
    }

    public update(world: World): void {
        const ids = world.getActiveEntityIds();
        this.countEl_.textContent = String(ids.length);
        this.renderIds(ids);
    }

    private renderIds(ids: EntityID[]): void {
        this.listEl_.replaceChildren();
        if (ids.length === 0) {
            const empty = document.createElement("li");
            empty.className = "entity-id entity-id--empty";
            empty.textContent = "—";
            this.listEl_.appendChild(empty);
            return;
        }

        for (const id of ids) {
            const item = document.createElement("li");
            item.className = "entity-id";
            item.textContent = String(id);
            this.listEl_.appendChild(item);
        }
    }
}
