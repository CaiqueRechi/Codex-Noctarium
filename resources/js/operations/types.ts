import type { SaveState } from '../documents/types';

export type OperationStatus =
    | 'pending'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'attention';

export type OperationalTask = {
    id: string;
    type: string;
    status: OperationStatus;
    progressCurrent: number;
    progressTotal: number;
    message: string;
    errorCode: string | null;
    createdAt: string;
    finishedAt: string | null;
};

export type OperationalSaveState = SaveState | null;
