export function contextNodeId(contextId: string): string {
    return `context:${contextId}`;
}

export function entityNodeId(contextId: string, entityId: string): string {
    return `entity:${contextId}:${entityId}`;
}
