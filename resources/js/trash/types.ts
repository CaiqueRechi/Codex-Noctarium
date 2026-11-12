import type { DocumentSummary } from '../documents/types';
import type { RelationSummary } from '../relations/types';

export type TrashItem = {
    id: string;
    title: string | null;
    deletedAt: string;
};

export type EntityDeletion = {
    trashItem: TrashItem;
    deletedRelationIds: string[];
    trashedSubnoteIds?: string[];
};

// D-13: a note with subnotes is not deleted until the user agrees to take
// its subnotes along.
export type DeletionOutcome =
    | { kind: 'deleted'; deletion: EntityDeletion }
    | { kind: 'has-subnotes'; subnotes: number };

export type EntityRestoration = {
    entity: DocumentSummary;
    memberships: Array<{
        contextId: string;
        position: { x: number; y: number } | null;
        isPinned: boolean;
    }>;
    restoredRelations: RelationSummary[];
    brokenRelations: Array<{
        id: string;
        missingEntityIds: string[];
    }>;
};
