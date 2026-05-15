export type ClassType<T> = new (...args: any[]) => T;
export type ComponentType<T extends object = object> = ClassType<T>;
