import { describe, expect, it } from "vitest";
import {
    EntityCompositionIndex,
    ErrEntityAlreadyExist,
    ErrNoComponentSetForEntity,
} from "./entity-index";

class Position {
    x = 0;
}

class Velocity {
    y = 0;
}

describe("EntityCompositionIndex", () => {
    const position = Position;
    const velocity = Velocity;

    it("starts with no entities", () => {
        const index = new EntityCompositionIndex();

        expect(index.getEntityIds()).toEqual([]);
    });

    it("registers an entity with an empty component set", () => {
        const index = new EntityCompositionIndex();

        index.addEntity(1);

        expect(index.getEntityIds()).toEqual([1]);
        expect(index.getComponents(1).size).toBe(0);
    });

    it("throws when registering the same entity twice", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);

        expect(() => index.addEntity(1)).toThrow(ErrEntityAlreadyExist);
        expect(() => index.addEntity(1)).toThrow(/Entity with ID \[1\] already exist/);
    });

    it("tracks multiple entities independently", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addEntity(2);

        expect(new Set(index.getEntityIds())).toEqual(new Set([1, 2]));
    });

    it("adds a component to an existing entity", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);

        index.addComponent(1, position);

        expect(index.getComponents(1).has(position)).toBe(true);
        expect(index.getComponents(1).size).toBe(1);
    });

    it("accumulates multiple components on one entity", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addComponent(1, position);
        index.addComponent(1, velocity);

        const components = index.getComponents(1);
        expect(components.has(position)).toBe(true);
        expect(components.has(velocity)).toBe(true);
        expect(components.size).toBe(2);
    });

    it("does not duplicate components when added twice", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addComponent(1, position);
        index.addComponent(1, position);

        expect(index.getComponents(1).size).toBe(1);
    });

    it("removes a component from an entity", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addComponent(1, position);
        index.addComponent(1, velocity);

        index.removeComponent(1, position);

        const components = index.getComponents(1);
        expect(components.has(position)).toBe(false);
        expect(components.has(velocity)).toBe(true);
        expect(components.size).toBe(1);
    });

    it("allows removing a component that is not present", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addComponent(1, position);

        expect(() => index.removeComponent(1, velocity)).not.toThrow();
        expect(index.getComponents(1).has(position)).toBe(true);
    });

    it("removes an entity and its composition entry", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addEntity(2);
        index.addComponent(1, position);

        index.removeEntity(1);

        expect(index.getEntityIds()).toEqual([2]);
    });

    it("allows removing an entity that was never registered", () => {
        const index = new EntityCompositionIndex();

        expect(() => index.removeEntity(99)).not.toThrow();
        expect(index.getEntityIds()).toEqual([]);
    });

    it("throws when accessing components of an unregistered entity", () => {
        const index = new EntityCompositionIndex();

        expect(() => index.getComponents(1)).toThrow(ErrNoComponentSetForEntity);
        expect(() => index.getComponents(1)).toThrow(/does not exist in EntityCompositionIndex/);
    });

    it("throws when adding a component to an unregistered entity", () => {
        const index = new EntityCompositionIndex();

        expect(() => index.addComponent(1, position)).toThrow(ErrNoComponentSetForEntity);
    });

    it("throws when removing a component from an unregistered entity", () => {
        const index = new EntityCompositionIndex();

        expect(() => index.removeComponent(1, position)).toThrow(ErrNoComponentSetForEntity);
    });

    it("throws when accessing a removed entity", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addComponent(1, position);
        index.removeEntity(1);

        expect(() => index.getComponents(1)).toThrow(ErrNoComponentSetForEntity);
    });

    it("isolates component sets between entities", () => {
        const index = new EntityCompositionIndex();
        index.addEntity(1);
        index.addEntity(2);
        index.addComponent(1, position);
        index.addComponent(2, velocity);

        expect(index.getComponents(1).has(position)).toBe(true);
        expect(index.getComponents(1).has(velocity)).toBe(false);
        expect(index.getComponents(2).has(velocity)).toBe(true);
        expect(index.getComponents(2).has(position)).toBe(false);
    });
});
