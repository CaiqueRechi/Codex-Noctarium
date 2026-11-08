import { DocumentSaveError } from './save-request';
import type { OpenedDocument, SaveState } from './types';

type SaveDocument = (
    document: OpenedDocument,
    content: string,
) => Promise<OpenedDocument>;

type SaveSnapshot = {
    document: OpenedDocument | null;
    draft: string;
    saveState: SaveState;
    error: string | null;
};

const pauseMilliseconds = 1500;
const maximumAttempts = 3;

export class DocumentAutosave {
    private snapshot: SaveSnapshot = {
        document: null,
        draft: '',
        saveState: 'saved',
        error: null,
    };
    private listeners = new Set<() => void>();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private cancelRetry: (() => void) | null = null;
    private inFlight: Promise<boolean> | null = null;
    private lastEditAt = 0;
    private active = true;

    constructor(private readonly saveDocument: SaveDocument) {}

    getSnapshot = (): SaveSnapshot => this.snapshot;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    };

    hasPendingChanges = (): boolean =>
        this.snapshot.document !== null &&
        (this.snapshot.draft !== this.snapshot.document.content ||
            this.snapshot.saveState === 'saving' ||
            this.snapshot.saveState === 'failed');

    open = (document: OpenedDocument): boolean => {
        if (this.hasPendingChanges()) {
            return false;
        }

        this.clearTimer();
        this.publish({
            document,
            draft: document.content,
            saveState: 'saved',
            error: null,
        });

        return true;
    };

    updateDocument = (
        update: (document: OpenedDocument | null) => OpenedDocument | null,
    ): void => {
        this.publish({
            ...this.snapshot,
            document: update(this.snapshot.document),
        });
    };

    close = (): void => {
        if (this.hasPendingChanges()) {
            return;
        }

        this.clearTimer();
        this.publish({
            document: null,
            draft: '',
            saveState: 'saved',
            error: null,
        });
    };

    change = (draft: string): void => {
        if (!this.snapshot.document) {
            return;
        }

        this.lastEditAt = Date.now();
        const saveState =
            this.snapshot.saveState === 'saving'
                ? 'saving'
                : this.snapshot.saveState === 'failed'
                  ? 'failed'
                  : draft === this.snapshot.document.content
                    ? 'saved'
                    : 'pending';
        this.publish({
            ...this.snapshot,
            draft,
            saveState,
            error: saveState === 'failed' ? this.snapshot.error : null,
        });
        this.schedule();
    };

    save = (): Promise<boolean> => {
        if (this.inFlight) {
            return this.inFlight;
        }

        if (!this.active || !this.hasPendingChanges()) {
            return Promise.resolve(!this.hasPendingChanges());
        }

        this.clearTimer();
        // Defer the request so synchronous listeners also see the single-flight promise.
        this.inFlight = Promise.resolve()
            .then(() => this.saveCycle())
            .finally(() => {
                this.inFlight = null;
                this.schedule();
            });
        this.publish({ ...this.snapshot, saveState: 'saving', error: null });

        return this.inFlight;
    };

    flush = async (): Promise<boolean> => {
        if (this.snapshot.saveState === 'failed') {
            return false;
        }

        while (this.active && this.hasPendingChanges()) {
            if (!(await this.save())) {
                return false;
            }
        }

        return this.active;
    };

    activate = (): void => {
        this.active = true;
        this.schedule();
    };

    dispose = (): void => {
        this.active = false;
        this.clearTimer();
        this.cancelRetry?.();
    };

    private async saveCycle(): Promise<boolean> {
        const document = this.snapshot.document;
        const content = this.snapshot.draft;

        if (!document || !this.active) {
            return false;
        }

        for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
            try {
                const saved = await this.saveDocument(document, content);

                if (!this.active) {
                    return false;
                }

                this.publish({
                    ...this.snapshot,
                    document: {
                        ...saved,
                        ...this.snapshot.document,
                        content: saved.content,
                        revision: saved.revision,
                        title: saved.title,
                    },
                    saveState:
                        this.snapshot.draft === saved.content
                            ? 'saved'
                            : 'pending',
                    error: null,
                });

                return true;
            } catch (exception) {
                if (!this.active) {
                    return false;
                }

                if (
                    attempt === maximumAttempts ||
                    !(exception instanceof DocumentSaveError) ||
                    !exception.retryable
                ) {
                    this.publish({
                        ...this.snapshot,
                        saveState: 'failed',
                        error:
                            exception instanceof Error
                                ? exception.message
                                : 'Não foi possível salvar o documento.',
                    });

                    return false;
                }

                if (!(await this.waitForRetry())) {
                    return false;
                }
            }
        }

        return false;
    }

    private schedule(): void {
        this.clearTimer();

        if (
            !this.active ||
            this.inFlight ||
            this.snapshot.saveState !== 'pending'
        ) {
            return;
        }

        const remaining = Math.max(
            0,
            pauseMilliseconds - (Date.now() - this.lastEditAt),
        );
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.save();
        }, remaining);
    }

    private waitForRetry(): Promise<boolean> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.cancelRetry = null;
                resolve(this.active);
            }, pauseMilliseconds);
            this.cancelRetry = () => {
                clearTimeout(timer);
                this.cancelRetry = null;
                resolve(false);
            };
        });
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private publish(snapshot: SaveSnapshot): void {
        this.snapshot = snapshot;
        this.listeners.forEach((listener) => listener());
    }
}
