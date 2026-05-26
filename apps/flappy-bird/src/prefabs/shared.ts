export type ApplyComponentOptions<T extends object> = {
    exclude?: Array<keyof T>;
};

export function applyComponent<T extends object>(
    dest: T,
    target?: Readonly<T>,
    options?: ApplyComponentOptions<T>,
): void {
    if (!target) {
        return;
    }
    for (const key in target) {
        if (
            Array.isArray(options?.exclude) &&
            options.exclude.length > 0 &&
            options.exclude.includes(key)
        ) {
            continue;
        }

        dest[key] = target[key];
    }
}
