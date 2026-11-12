import type { EntityProperties } from '../entities/types';

export type RelationSummary = {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    sourceTitle?: string | null;
    targetTitle?: string | null;
    contextId: string | null;
    relationType: string | null;
    isDirected: boolean;
    properties: EntityProperties;
};
