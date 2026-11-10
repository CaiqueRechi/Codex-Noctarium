import type { AttachmentSummary } from '../attachments/types';
import type { EntityProperties } from '../entities/types';

export type DocumentSummary = {
    id: string;
    title: string | null;
    revision: number;
    ownContent?: number | null;
    entityType: string | null;
    properties: EntityProperties;
    tags?: string[];
    attachments?: AttachmentSummary[];
    position?: { x: number; y: number } | null;
    isPinned?: boolean;
};

export type OpenedDocument = DocumentSummary & {
    content: string;
};

export type SaveState = 'pending' | 'saving' | 'saved' | 'failed';
