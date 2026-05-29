import { describe, expect, it } from "vitest";
import { NoopLogger } from "../../logger";
import { Component } from "../components/utils";
import type { EntityID } from "../entity";
import { World } from "../world";

@Component({ name: "QueryTestPosition" })
class QueryTestPosition {}

@Component({ name: "QueryTestVelocity" })
class QueryTestVelocity {}

@Component({ name: "QueryTestHealth" })
class QueryTestHealth {}

@Component({ name: "QueryTestTag" })
class QueryTestTag {}

function createWorld(): World {
    const world = new World({ logger: new NoopLogger() });
    world.components.register(QueryTestPosition);
    world.components.register(QueryTestVelocity);
    world.components.register(QueryTestHealth);
    world.components.register(QueryTestTag);
    return world;
}

function spawn(
    world: World,
    components: Array<typeof QueryTestPosition>,
): EntityID {
    const id = world.createEntity();
    for (const component of components) {
        world.addComponent(id, component);
    }
    return id;
}

describe("QueryManager", () => {
    it("returns an empty list when no query constraints are given", () => {
        const world = createWorld();
        spawn(world, [QueryTestPosition]);

        expect(world.query({})).toEqual([]);
    });

    it("returns an empty list when no entity has the included components", () => {
        const world = createWorld();
        spawn(world, [QueryTestVelocity]);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([]);
    });

    it("returns entities that have every included component", () => {
        const world = createWorld();
        const positionOnly = spawn(world, [QueryTestPosition]);
        const withVelocity = spawn(world, [QueryTestPosition, QueryTestVelocity]);

        expect(world.query({ include: [QueryTestPosition] }).sort()).toEqual(
            [positionOnly, withVelocity].sort(),
        );
        expect(world.query({ include: [QueryTestPosition, QueryTestVelocity] })).toEqual([
            withVelocity,
        ]);
    });

    it("excludes entities that have an excluded component", () => {
        const world = createWorld();
        const plain = spawn(world, [QueryTestPosition]);
        spawn(world, [QueryTestPosition, QueryTestTag]);

        expect(world.query({ include: [QueryTestPosition], exclude: [QueryTestTag] })).toEqual([
            plain,
        ]);
    });

    it("returns entities that have at least one anyOf component when include is omitted", () => {
        const world = createWorld();
        const position = spawn(world, [QueryTestPosition]);
        const velocity = spawn(world, [QueryTestVelocity]);
        spawn(world, [QueryTestHealth]);

        expect(
            world.query({ anyOf: [QueryTestPosition, QueryTestVelocity] }).sort(),
        ).toEqual([position, velocity].sort());
    });

    it("requires both include and anyOf when both are specified", () => {
        const world = createWorld();
        const match = spawn(world, [QueryTestPosition, QueryTestVelocity]);
        spawn(world, [QueryTestPosition]);
        spawn(world, [QueryTestVelocity]);

        expect(
            world.query({ include: [QueryTestPosition], anyOf: [QueryTestVelocity] }),
        ).toEqual([match]);
    });

    it("excludes specific entity ids via excludeEntitiesIds on each call", () => {
        const world = createWorld();
        const first = spawn(world, [QueryTestPosition]);
        const second = spawn(world, [QueryTestPosition]);

        expect(
            world.query({
                include: [QueryTestPosition],
                excludeEntitiesIds: [first],
            }),
        ).toEqual([second]);

        expect(
            world.query({
                include: [QueryTestPosition],
                excludeEntitiesIds: [second],
            }),
        ).toEqual([first]);
    });

    it("applies a filter callback on each call without caching its results", () => {
        const world = createWorld();
        const kept = spawn(world, [QueryTestPosition]);
        spawn(world, [QueryTestPosition]);

        expect(
            world.query({
                include: [QueryTestPosition],
                filter: (id) => id === kept,
            }),
        ).toEqual([kept]);

        expect(
            world.query({
                include: [QueryTestPosition],
                filter: (id) => id !== kept,
            }).length,
        ).toBe(1);
    });

    it("reflects a newly added component after invalidation", () => {
        const world = createWorld();
        const id = world.createEntity();

        expect(world.query({ include: [QueryTestPosition] })).toEqual([]);

        world.addComponent(id, QueryTestPosition);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([id]);
    });

    it("drops an entity after its matching component is removed", () => {
        const world = createWorld();
        const id = spawn(world, [QueryTestPosition]);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([id]);

        world.removeComponent(id, QueryTestPosition);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([]);
    });

    it("drops a destroyed entity from subsequent queries", () => {
        const world = createWorld();
        const id = spawn(world, [QueryTestPosition]);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([id]);

        world.destroyEntity(id);

        expect(world.query({ include: [QueryTestPosition] })).toEqual([]);
    });

    it("returns stable results for repeated identical queries when the world is unchanged", () => {
        const world = createWorld();
        spawn(world, [QueryTestPosition]);
        const params = { include: [QueryTestPosition] };

        const first = world.query(params);
        const second = world.query(params);

        expect(second).toEqual(first);
    });

    it("does not return invalid entity ids", () => {
        const world = createWorld();
        const id = spawn(world, [QueryTestPosition]);

        for (const resultId of world.query({ include: [QueryTestPosition] })) {
            expect(resultId).toBe(id);
            expect(world.getActiveEntityIds()).toContain(resultId);
        }
    });
});
