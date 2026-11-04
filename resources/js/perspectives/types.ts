export type PerspectiveFilters = {
    contextIds: string[];
    entityTypes: string[];
};

export type PerspectiveLayout = {
    contextId: string;
    entityId: string;
    position: { x: number; y: number } | null;
    isPinned: boolean;
};

export type PerspectiveSummary = {
    id: string;
    name: string;
    sourcePerspectiveId: string | null;
    filters: PerspectiveFilters;
    layouts: PerspectiveLayout[];
};
