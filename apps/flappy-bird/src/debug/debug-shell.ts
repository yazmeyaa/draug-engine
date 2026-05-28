import "./debug-shell.css";
import { DebugDrawer } from "./debug-drawer";

export interface DebugShellMount {
    logsRoot: HTMLElement;
    entityRoot: HTMLElement;
    settingsRoot: HTMLElement;
}

export function mountDebugShell(): DebugShellMount {
    const shell = document.createElement("aside");
    shell.id = "debug-shell";
    shell.className = "debug-shell";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "debug-toggle";
    toggle.className = "debug-shell__toggle";
    toggle.textContent = "DBG";
    toggle.setAttribute("aria-controls", "debug-drawer");
    toggle.setAttribute("aria-expanded", "false");

    const rail = document.createElement("div");
    rail.className = "debug-shell__rail";

    const drawer = document.createElement("div");
    drawer.id = "debug-drawer";
    drawer.className = "debug-shell__drawer";

    const logsRoot = createPanel("debug-panel", "debug-card debug-card--logs");
    const entityRoot = createPanel("entity-panel", "debug-card debug-card--entities");
    const settingsRoot = createPanel("settings-panel", "debug-card");

    drawer.append(logsRoot, entityRoot, settingsRoot);
    rail.append(toggle, drawer);
    shell.append(rail);
    document.body.appendChild(shell);

    new DebugDrawer(shell, toggle);

    return { logsRoot, entityRoot, settingsRoot };
}

function createPanel(id: string, className: string): HTMLElement {
    const panel = document.createElement("section");
    panel.id = id;
    panel.className = className;
    panel.setAttribute("aria-live", "polite");
    return panel;
}
