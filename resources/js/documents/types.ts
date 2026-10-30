export type DocumentSummary = {
    id: string;
    title: string | null;
    revision: number;
};

export type OpenedDocument = DocumentSummary & {
    content: string;
};

export type SaveState = 'pending' | 'saving' | 'saved' | 'failed';
