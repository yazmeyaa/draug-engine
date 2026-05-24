import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    Plugin,
    PluginBase,
    PluginsManager,
    ErrNotAPlugin,
    ErrMissingPluginMetadata,
    ErrUnknownPlugin,
    ErrPluginNotInit,
    ErrMissingPluginDependency,
    ErrDAGCycleDetectedPlugin,
    getPluginMetadata,
} from "./plugin";
import type { Logger } from "../../logger";
import { NoopLogger } from "../../logger";
import type { World } from "../world";


function expectBefore(
    order: string[],
    before: string,
    after: string,
) {
    expect(order.indexOf(before))
        .toBeLessThan(order.indexOf(after));
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

// Simple test plugins for basic testing
@Plugin({
    id: "test-plugin-a",
    version: "1.0.0",
    name: "Test Plugin A",
})
class PluginA extends PluginBase { }

@Plugin({
    id: "test-plugin-b",
    version: "1.0.0",
    name: "Test Plugin B",
})
class PluginB extends PluginBase { }

@Plugin({
    id: "test-plugin-with-deps",
    version: "1.0.0",
    name: "Test Plugin With Dependencies",
    dependencies: {
        plugins: [{ plugin: PluginA }],
    },
})
class PluginWithDeps extends PluginBase {
    public loadCalled = false;

    public onPluginLoad = () => {
        this.loadCalled = true;
    }
}

@Plugin({
    id: "test-plugin-with-params",
    version: "1.0.0",
    name: "Test Plugin With Constructor Parameters",
})
class PluginWithParams extends PluginBase {
    constructor(public value: number, public name: string) {
        super();
    }

    public onPluginLoad = () => { }
}

@Plugin({
    id: "test-plugin-c",
    version: "1.0.0",
    name: "Test Plugin C",
    dependencies: {
        plugins: [{ plugin: PluginB }],
    },
})
class PluginC extends PluginBase {
    public loadCalled = false;

    public onPluginLoad = () => {
        this.loadCalled = true;
    }
}

@Plugin({
    id: "test-plugin-d",
    version: "1.0.0",
    name: "Test Plugin D",
    dependencies: {
        plugins: [{ plugin: PluginC }],
    },
})
class PluginD extends PluginBase {
    public loadCalled = false;

    public onPluginLoad = () => {
        this.loadCalled = true;
    }
}

// Non-plugin class for negative testing
class NotAPlugin {
    public value = 42;
}

// ============================================================================
// TESTS
// ============================================================================

describe("PluginsManager", () => {
    let manager: PluginsManager;
    let logger: Logger;

    beforeEach(() => {
        logger = new NoopLogger();
        manager = new PluginsManager(logger);
    });

    // ========================================================================
    // POSITIVE TESTS - Basic Functionality
    // ========================================================================

    describe("Basic installation and building", () => {
        it("installs a single plugin without errors", () => {
            expect(() => {
                manager.install(PluginA);
            }).not.toThrow();
        });

        it("installs multiple plugins without errors", () => {
            expect(() => {
                manager.install(PluginA);
                manager.install(PluginB);
            }).not.toThrow();
        });

        it("builds with no plugins (empty case)", () => {
            expect(() => {
                manager.build();
            }).not.toThrow();
        });

        it("builds a single installed plugin", () => {
            manager.install(PluginA);
            expect(() => {
                manager.build();
            }).not.toThrow();
        });

        it("builds multiple installed plugins", () => {
            manager.install(PluginA);
            manager.install(PluginB);
            expect(() => {
                manager.build();
            }).not.toThrow();
        });
    });

    describe("Plugin lifecycle hooks", () => {
        it("calls onPluginLoad hook during build", () => {
            let hookCalled = false;

            @Plugin({
                id: "hook-test-1",
                version: "1.0.0",
                name: "Hook Test 1",
            })
            class HookPlugin1 extends PluginBase {
                constructor() {
                    super();
                    this.onPluginLoad = () => {
                        hookCalled = true;
                    };
                }
            }

            manager.install(HookPlugin1);
            expect(hookCalled).toBe(false);

            manager.build();
            expect(hookCalled).toBe(true);
        });

        it("calls onPluginLoad hook for all plugins", () => {
            const loadOrder: string[] = [];

            @Plugin({
                id: "hook-test-2a",
                version: "1.0.0",
                name: "Hook Test 2A",
            })
            class HookPlugin2A extends PluginBase {
                constructor() {
                    super();
                    this.onPluginLoad = () => {
                        loadOrder.push("A");
                    };
                }
            }

            @Plugin({
                id: "hook-test-2b",
                version: "1.0.0",
                name: "Hook Test 2B",
            })
            class HookPlugin2B extends PluginBase {
                constructor() {
                    super();
                    this.onPluginLoad = () => {
                        loadOrder.push("B");
                    };
                }
            }

            manager.install(HookPlugin2A);
            manager.install(HookPlugin2B);
            manager.build();

            expect(loadOrder).toContain("A");
            expect(loadOrder).toContain("B");
        });

        it("calls onAfterWorldInit hook with world instance", () => {
            let hookCalled = false;
            let worldPassed: any = null;

            @Plugin({
                id: "hook-test-3",
                version: "1.0.0",
                name: "Hook Test 3",
            })
            class HookPlugin3 extends PluginBase {
                constructor() {
                    super();
                    this.onAfterWorldInit = (world: World) => {
                        hookCalled = true;
                        worldPassed = world;
                    };
                }
            }

            manager.install(HookPlugin3);
            manager.build();

            const mockWorld = { id: "test-world" } as any as World;
            manager.__internal__onAfterWorldInit(mockWorld);

            expect(hookCalled).toBe(true);
            expect(worldPassed).toBe(mockWorld);
        });
    });

    describe("Plugin instance retrieval", () => {
        it("returns the same instance on repeated calls", () => {
            manager.install(PluginA);
            manager.build();

            const instance1 = manager.getPluginInstance(PluginA);
            const instance2 = manager.getPluginInstance(PluginA);

            expect(instance1).toBe(instance2);
        });

        it("returns instance of correct type", () => {
            manager.install(PluginA);
            manager.build();

            const instance = manager.getPluginInstance(PluginA);
            expect(instance).toBeInstanceOf(PluginA);
        });

        it("returns different instances for different plugins", () => {
            manager.install(PluginA);
            manager.install(PluginB);
            manager.build();

            const instanceA = manager.getPluginInstance(PluginA);
            const instanceB = manager.getPluginInstance(PluginB);

            expect(instanceA).not.toBe(instanceB);
        });
    });

    describe("Plugin metadata", () => {
        it("retrieves plugin metadata correctly", () => {
            manager.install(PluginA);

            const metadata = manager.getPluginMetadata(PluginA);

            expect(metadata.id).toBe("test-plugin-a");
            expect(metadata.version).toBe("1.0.0");
            expect(metadata.name).toBe("Test Plugin A");
        });

        it("retrieves metadata for all installed plugins", () => {
            manager.install(PluginA);
            manager.install(PluginB);

            const metadataA = manager.getPluginMetadata(PluginA);
            const metadataB = manager.getPluginMetadata(PluginB);

            expect(metadataA.id).toBe("test-plugin-a");
            expect(metadataB.id).toBe("test-plugin-b");
        });
    });

    // ========================================================================
    // POSITIVE TESTS - Constructor Parameters
    // ========================================================================

    describe("Constructor parameters", () => {
        it("passes constructor parameters to plugin", () => {
            manager.install(PluginWithParams, 42, "test-name");
            manager.build();

            const instance = manager.getPluginInstance(PluginWithParams);
            expect(instance.value).toBe(42);
            expect(instance.name).toBe("test-name");
        });

        it("handles multiple constructor parameters correctly", () => {
            manager.install(PluginWithParams, 123, "hello");
            manager.build();

            const instance = manager.getPluginInstance(PluginWithParams);
            expect(instance.value).toBe(123);
            expect(instance.name).toBe("hello");
        });
    });

    // ========================================================================
    // POSITIVE TESTS - Dependencies
    // ========================================================================

    describe("Plugin dependencies", () => {
        it("installs plugin with dependencies", () => {
            expect(() => {
                manager.install(PluginA);
                manager.install(PluginWithDeps);
                manager.build();
            }).not.toThrow();
        });

        it("initializes plugins in dependency order", () => {
            const loadOrder: string[] = [];

            @Plugin({
                id: "ordered-a",
                version: "1.0.0",
                name: "Ordered A",
            })
            class OrderedA extends PluginBase {
                constructor() {
                    super();
                    this.onPluginLoad = () => {
                        loadOrder.push("A");
                    };
                }
            }

            @Plugin({
                id: "ordered-b",
                version: "1.0.0",
                name: "Ordered B",
                dependencies: {
                    plugins: [{ plugin: OrderedA }],
                },
            })
            class OrderedB extends PluginBase {
                constructor() {
                    super();
                    this.onPluginLoad = () => {
                        loadOrder.push("B");
                    };
                }
            }

            manager.install(OrderedB);
            manager.install(OrderedA);
            manager.build();

            expect(loadOrder).toEqual(["A", "B"]);
        });

        it("handles transitive dependencies correctly", () => {
            const loadOrder: string[] = [];

            @Plugin({
                id: "trans-a",
                version: "1.0.0",
                name: "Transitive A",
            })
            class TransA extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("A");
                }
            }

            @Plugin({
                id: "trans-b",
                version: "1.0.0",
                name: "Transitive B",
                dependencies: {
                    plugins: [{ plugin: TransA }],
                },
            })
            class TransB extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("B");
                }
            }

            @Plugin({
                id: "trans-c",
                version: "1.0.0",
                name: "Transitive C",
                dependencies: {
                    plugins: [{ plugin: TransB }],
                },
            })
            class TransC extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("C");
                }
            }

            const testManager = new PluginsManager(logger);
            testManager.install(TransA);
            testManager.install(TransB);
            testManager.install(TransC);
            testManager.build();

            // All plugins should be loaded
            expect(loadOrder).toContain("A");
            expect(loadOrder).toContain("B");
            expect(loadOrder).toContain("C");

            // Verify they were loaded in dependency order
            expectBefore(loadOrder, "A", "B");
            expectBefore(loadOrder, "B", "C");
        });

        it("handles complex dependency graphs", () => {
            const loadOrder: string[] = [];

            @Plugin({
                id: "complex-a",
                version: "1.0.0",
                name: "Complex A",
            })
            class ComplexA extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("A");
                }
            }

            @Plugin({
                id: "complex-b",
                version: "1.0.0",
                name: "Complex B",
            })
            class ComplexB extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("B");
                }
            }

            @Plugin({
                id: "complex-c",
                version: "1.0.0",
                name: "Complex C",
                dependencies: {
                    plugins: [{ plugin: ComplexA }, { plugin: ComplexB }],
                },
            })
            class ComplexC extends PluginBase {
                onPluginLoad = () => {
                    loadOrder.push("C");
                }
            }

            manager.install(ComplexA);
            manager.install(ComplexB);
            manager.install(ComplexC);
            manager.build();

            expect(loadOrder).toContain("A");
            expect(loadOrder).toContain("B");
            expectBefore(loadOrder, "A", "C");
            expectBefore(loadOrder, "B", "C");
        });
    });

    // ========================================================================
    // POSITIVE TESTS - Idempotency
    // ========================================================================

    describe("Idempotency", () => {
        it("allows multiple calls to install same plugin", () => {
            expect(() => {
                manager.install(PluginA);
                manager.install(PluginA);
                manager.install(PluginA);
            }).not.toThrow();
        });

        it("only creates one instance when installing same plugin multiple times", () => {
            manager.install(PluginA);
            manager.install(PluginA);
            manager.build();

            const instance1 = manager.getPluginInstance(PluginA);
            const instance2 = manager.getPluginInstance(PluginA);

            expect(instance1).toBe(instance2);
        });
    });

    // ========================================================================
    // NEGATIVE TESTS - Non-plugin Classes
    // ========================================================================

    describe("Non-plugin class validation", () => {
        it("throws when installing non-plugin class", () => {
            expect(() => {
                manager.install(NotAPlugin as any);
            }).toThrow(ErrMissingPluginMetadata);
        });

        it("throws when installing class without decorator", () => {
            class UndecoredClass extends PluginBase { }

            expect(() => {
                manager.install(UndecoredClass);
            }).toThrow(ErrMissingPluginMetadata);
        });
    });

    // ========================================================================
    // NEGATIVE TESTS - Lifecycle Errors
    // ========================================================================

    describe("Lifecycle errors", () => {
        it("throws when getting instance before build", () => {
            manager.install(PluginA);

            expect(() => {
                manager.getPluginInstance(PluginA);
            }).toThrow(ErrPluginNotInit);
        });

        it("throws with appropriate error message before build", () => {
            manager.install(PluginA);

            expect(() => {
                manager.getPluginInstance(PluginA);
            }).toThrow(/not initiated yet/);
        });
    });

    // ========================================================================
    // NEGATIVE TESTS - Unknown Plugins
    // ========================================================================

    describe("Unknown plugin handling", () => {
        it("throws when getting instance of uninstalled plugin", () => {
            manager.build();

            expect(() => {
                manager.getPluginInstance(PluginA);
            }).toThrow(ErrUnknownPlugin);
        });

        it("throws when getting metadata of uninstalled plugin", () => {
            expect(() => {
                manager.getPluginMetadata(PluginA);
            }).toThrow(ErrUnknownPlugin);
        });
    });

    // ========================================================================
    // NEGATIVE TESTS - Missing Dependencies
    // ========================================================================

    describe("Missing dependency handling", () => {
        it("throws when plugin depends on uninstalled plugin", () => {
            manager.install(PluginWithDeps);

            expect(() => {
                manager.build();
            }).toThrow(ErrMissingPluginDependency);
        });

        it("throws with informative error for missing dependency", () => {
            manager.install(PluginWithDeps);

            expect(() => {
                manager.build();
            }).toThrow(/Missing required dependency/);
        });

        it("throws when transitive dependency is missing", () => {
            @Plugin({
                id: "missing-a",
                version: "1.0.0",
                name: "Missing A",
            })
            class MissingA extends PluginBase { }

            @Plugin({
                id: "missing-b",
                version: "1.0.0",
                name: "Missing B",
                dependencies: {
                    plugins: [{ plugin: MissingA }],
                },
            })
            class MissingB extends PluginBase { }

            @Plugin({
                id: "missing-c",
                version: "1.0.0",
                name: "Missing C",
                dependencies: {
                    plugins: [{ plugin: MissingB }],
                },
            })
            class MissingC extends PluginBase { }

            const testManager = new PluginsManager(logger);
            testManager.install(MissingC);
            testManager.install(MissingB);
            // MissingA is not installed

            expect(() => {
                testManager.build();
            }).toThrow(ErrMissingPluginDependency);
        });
    });

    // ========================================================================
    // NEGATIVE TESTS - Circular Dependencies
    // ========================================================================

    describe("Circular dependency detection", () => {
        it("throws when detecting circular dependency", () => {
            // Create a mock manager to test circular detection
            const testManager = new PluginsManager(logger);

            // Create first plugin with self-referencing dependency
            // We'll define them separately to avoid forward reference issues
            @Plugin({
                id: "circ-1",
                version: "1.0.0",
                name: "Circular 1",
                dependencies: {},
            })
            class Circ1 extends PluginBase { }

            @Plugin({
                id: "circ-2",
                version: "1.0.0",
                name: "Circular 2",
                dependencies: {},
            })
            class Circ2 extends PluginBase { }

            // Manually modify metadata to create circular dependency
            const metadata1 = getPluginMetadata(Circ1);
            const metadata2 = getPluginMetadata(Circ2);

            metadata1.dependencies = { plugins: [{ plugin: Circ2 }] };
            metadata2.dependencies = { plugins: [{ plugin: Circ1 }] };

            testManager.install(Circ1);
            testManager.install(Circ2);

            expect(() => {
                testManager.build();
            }).toThrow(ErrDAGCycleDetectedPlugin);
        });

        it("throws with appropriate error message", () => {
            const testManager = new PluginsManager(logger);

            @Plugin({
                id: "circ-3",
                version: "1.0.0",
                name: "Circular 3",
            })
            class Circ3 extends PluginBase { }

            @Plugin({
                id: "circ-4",
                version: "1.0.0",
                name: "Circular 4",
            })
            class Circ4 extends PluginBase { }

            const metadata3 = getPluginMetadata(Circ3);
            const metadata4 = getPluginMetadata(Circ4)

            metadata3.dependencies = { plugins: [{ plugin: Circ4 }] };
            metadata4.dependencies = { plugins: [{ plugin: Circ3 }] };

            testManager.install(Circ3);
            testManager.install(Circ4);

            expect(() => {
                testManager.build();
            }).toThrow(/Cycle detected/);
        });
    });

    // ========================================================================
    // EDGE CASES - Plugin Hooks Variations
    // ========================================================================

    describe("Plugin hooks edge cases", () => {
        it("handles plugin with no hooks defined", () => {
            @Plugin({
                id: "no-hooks",
                version: "1.0.0",
                name: "No Hooks Plugin",
            })
            class NoHooksPlugin extends PluginBase { }

            manager.install(NoHooksPlugin);
            expect(() => {
                manager.build();
            }).not.toThrow();
        });

        it("handles plugin with only onPluginLoad hook", () => {
            let loadCalled = false;

            @Plugin({
                id: "only-load",
                version: "1.0.0",
                name: "Only Load Plugin",
            })
            class OnlyLoadPlugin extends PluginBase {
                onPluginLoad = () => {
                    loadCalled = true;
                }
            }

            manager.install(OnlyLoadPlugin);
            manager.build();

            expect(loadCalled).toBe(true);
        });

        it("handles plugin with only onAfterWorldInit hook", () => {
            let afterInitCalled = false;

            @Plugin({
                id: "only-after-init",
                version: "1.0.0",
                name: "Only After Init Plugin",
            })
            class OnlyAfterInitPlugin extends PluginBase {
                onAfterWorldInit = () => {
                    afterInitCalled = true;
                }
            }

            manager.install(OnlyAfterInitPlugin);
            manager.build();
            manager.__internal__onAfterWorldInit({} as World);

            expect(afterInitCalled).toBe(true);
        });
    });

    // ========================================================================
    // EDGE CASES - Large Scale
    // ========================================================================

    describe("Large scale scenarios", () => {
        it("handles many plugins without dependencies", () => {
            const testManager = new PluginsManager(logger);

            @Plugin({
                id: "many-1",
                version: "1.0.0",
                name: "Many 1",
            })
            class Many1 extends PluginBase { }

            @Plugin({
                id: "many-2",
                version: "1.0.0",
                name: "Many 2",
            })
            class Many2 extends PluginBase { }

            @Plugin({
                id: "many-3",
                version: "1.0.0",
                name: "Many 3",
            })
            class Many3 extends PluginBase { }

            @Plugin({
                id: "many-4",
                version: "1.0.0",
                name: "Many 4",
            })
            class Many4 extends PluginBase { }

            @Plugin({
                id: "many-5",
                version: "1.0.0",
                name: "Many 5",
            })
            class Many5 extends PluginBase { }

            const plugins = [Many1, Many2, Many3, Many4, Many5];

            for (const Plugin of plugins) {
                testManager.install(Plugin);
            }

            expect(() => {
                testManager.build();
            }).not.toThrow();

            // Verify all plugins were built
            for (const Plugin of plugins) {
                expect(() => {
                    testManager.getPluginInstance(Plugin);
                }).not.toThrow();
            }
        });
    });

    // ========================================================================
    // EDGE CASES - Empty Dependencies Array
    // ========================================================================

    describe("Empty dependencies edge cases", () => {
        it("handles plugin with empty dependencies object", () => {
            @Plugin({
                id: "empty-deps",
                version: "1.0.0",
                name: "Empty Dependencies Plugin",
                dependencies: {},
            })
            class EmptyDepsPlugin extends PluginBase { }

            manager.install(EmptyDepsPlugin);
            expect(() => {
                manager.build();
            }).not.toThrow();
        });

        it("handles plugin with undefined dependencies", () => {
            @Plugin({
                id: "undefined-deps",
                version: "1.0.0",
                name: "Undefined Dependencies Plugin",
            })
            class UndefinedDepsPlugin extends PluginBase { }

            manager.install(UndefinedDepsPlugin);
            expect(() => {
                manager.build();
            }).not.toThrow();
        });
    });

    // ========================================================================
    // EDGE CASES - Multiple Builds
    // ========================================================================

    describe("Multiple builds", () => {
        it("does not reinitialize plugins on second build call", () => {
            let loadCount = 0;

            @Plugin({
                id: "count-loads",
                version: "1.0.0",
                name: "Count Loads Plugin",
            })
            class CountLoadsPlugin extends PluginBase {
                onPluginLoad = () => {
                    loadCount++;
                }
            }

            manager.install(CountLoadsPlugin);
            manager.build();

            expect(loadCount).toBe(1);
        });
    });

    // ========================================================================
    // EDGE CASES - onAfterWorldInit for Multiple Plugins
    // ========================================================================

    describe("onAfterWorldInit with multiple plugins", () => {
        it("calls onAfterWorldInit for all plugins", () => {
            const calls: string[] = [];

            @Plugin({
                id: "world-init-a",
                version: "1.0.0",
                name: "World Init A",
            })
            class WorldInitA extends PluginBase {
                onAfterWorldInit = () => {
                    calls.push("A");
                }
            }

            @Plugin({
                id: "world-init-b",
                version: "1.0.0",
                name: "World Init B",
            })
            class WorldInitB extends PluginBase {
                onAfterWorldInit = () => {
                    calls.push("B");
                }
            }

            manager.install(WorldInitA);
            manager.install(WorldInitB);
            manager.build();
            manager.__internal__onAfterWorldInit({} as World);

            expect(calls).toContain("A");
            expect(calls).toContain("B");
        });
    });

    // ========================================================================
    // EDGE CASES - Version Variations
    // ========================================================================

    describe("Version variations", () => {
        it("accepts various version formats", () => {
            @Plugin({
                id: "version-1",
                version: "1.0.0",
                name: "Version 1",
            })
            class Version1 extends PluginBase { }

            @Plugin({
                id: "version-2",
                version: "0.0.1-alpha",
                name: "Version 2",
            })
            class Version2 extends PluginBase { }

            @Plugin({
                id: "version-3",
                version: "2.5.10",
                name: "Version 3",
            })
            class Version3 extends PluginBase { }

            manager.install(Version1);
            manager.install(Version2);
            manager.install(Version3);

            expect(() => {
                manager.build();
            }).not.toThrow();
        });
    });

    describe("Duplicate dependencies", () => {
    it("initializes dependency only once when duplicated in dependency list", () => {
        const loadOrder: string[] = [];
        let dependencyLoadCount = 0;

        @Plugin({
            id: "dup-dep-a",
            version: "1.0.0",
            name: "Duplicate Dependency A",
        })
        class DupA extends PluginBase {
            onPluginLoad = () => {
                dependencyLoadCount++;
                loadOrder.push("A");
            }
        }

        @Plugin({
            id: "dup-dep-b",
            version: "1.0.0",
            name: "Duplicate Dependency B",
            dependencies: {
                plugins: [
                    { plugin: DupA },
                    { plugin: DupA },
                    { plugin: DupA },
                ],
            },
        })
        class DupB extends PluginBase {
            onPluginLoad = () => {
                loadOrder.push("B");
            }
        }

        manager.install(DupA);
        manager.install(DupB);

        expect(() => {
            manager.build();
        }).not.toThrow();

        expect(dependencyLoadCount).toBe(1);

        expect(loadOrder.indexOf("A"))
            .toBeLessThan(loadOrder.indexOf("B"));
    });
});
});
