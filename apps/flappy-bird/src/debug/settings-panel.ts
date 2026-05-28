import type { World } from "@draug/engine";
import { GameSettingsResource } from "../resources/game-settings";

export class GameSettingsPanel {
    constructor(root: HTMLElement, world: World) {
        const settings = world.resources.get(GameSettingsResource);

        const heading = document.createElement("h3");
        heading.textContent = "Settings";
        root.appendChild(heading);

        const list = document.createElement("ul");
        list.className = "settings-list";
        root.appendChild(list);

        const item = document.createElement("li");
        item.className = "setting-item";

        const label = document.createElement("label");
        label.className = "setting-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = settings.disableBirdCollision;

        const text = document.createElement("span");
        text.textContent = "Disable bird collision";

        label.append(checkbox, text);
        item.appendChild(label);
        list.appendChild(item);

        checkbox.addEventListener("change", () => {
            settings.disableBirdCollision = checkbox.checked;
        });
    }
}
