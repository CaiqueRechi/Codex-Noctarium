export function requireFinite(value: number, name: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${name} must be finite.`);
    }
}

export function requireNonNegativeFinite(value: number, name: string): void {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`${name} must be finite and non-negative.`);
    }
}

export function requireCount(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative safe integer.`);
    }
}
