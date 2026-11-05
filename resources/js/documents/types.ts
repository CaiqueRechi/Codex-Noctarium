import type { EntityProperties } from '../entities/types';

export type DocumentSummary = {
    id: string;
    title: string | null;
    revision: number;
    entityType: string | null;
    properties: EntityProperties;
    tags?: string[];
    position?: { x: number; y: number } | null;
    isPinned?: boolean;
};

export type OpenedDocument = DocumentSummary & {
    content: string;
};

export type SaveState = 'pending' | 'saving' | 'saved' | 'failed';
