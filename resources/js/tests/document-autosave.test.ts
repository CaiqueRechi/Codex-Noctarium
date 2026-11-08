import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentAutosave } from '../documents/document-autosave';
import { DocumentSaveError } from '../documents/save-request';
import type { OpenedDocument } from '../documents/types';

const document: OpenedDocument = {
    id: 'note',
    title: 'Nota',
    content: 'original',
    revision: 1,
    entityType: null,
    properties: {},
};

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((fulfill) => {
        resolve = fulfill;
    });

    return { promise, resolve };
}

describe('RF-06 document autosave (RN-10, RN-11, D-08)', () => {
    const sessions: DocumentAutosave[] = [];
    const createSession = (
        save = vi.fn(async (note: OpenedDocument, content: string) => ({
            ...note,
            content,
            revision: note.revision + 1,
        })),
    ) => {
        const session = new DocumentAutosave(save);
        sessions.push(session);
        session.open(document);

        return { session, save };
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        sessions.forEach((session) => session.dispose());
        sessions.length = 0;
        vi.useRealTimers();
    });

    it('saves only after 1.5 seconds of inactivity and resets the deadline on each edit', async () => {
        const { session, save } = createSession();
        session.change('first');
        await vi.advanceTimersByTimeAsync(1499);
        expect(save).not.toHaveBeenCalled();
        session.change('second');
        await vi.advanceTimersByTimeAsync(1499);
        expect(save).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(save).toHaveBeenCalledExactlyOnceWith(document, 'second');
        expect(session.getSnapshot().saveState).toBe('saved');
        expect(session.hasPendingChanges()).toBe(false);
    });

    it('flushes immediately before navigation and waits for the confirmation', async () => {
        const request = deferred<OpenedDocument>();
        const { session, save } = createSession(vi.fn(() => request.promise));
        session.change('pending');
        let completed = false;
        const exit = session.flush().then((result) => {
            completed = result;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(save).toHaveBeenCalledTimes(1);
        expect(completed).toBe(false);
        expect(session.getSnapshot().saveState).toBe('saving');
        request.resolve({ ...document, content: 'pending', revision: 2 });
        await exit;
        expect(completed).toBe(true);
        expect(session.hasPendingChanges()).toBe(false);
    });

    it('never marks a slow or retried request as saved before confirmation', async () => {
        const request = deferred<OpenedDocument>();
        const save = vi
            .fn()
            .mockRejectedValueOnce(new DocumentSaveError('offline', true))
            .mockReturnValueOnce(request.promise);
        const { session } = createSession(save);
        session.change('pending');
        const cycle = session.save();
        await vi.advanceTimersByTimeAsync(1499);
        expect(save).toHaveBeenCalledTimes(1);
        expect(session.getSnapshot().saveState).toBe('saving');
        await vi.advanceTimersByTimeAsync(1);
        expect(save).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(10000);
        expect(session.getSnapshot().saveState).toBe('saving');
        request.resolve({ ...document, content: 'pending', revision: 2 });
        expect(await cycle).toBe(true);
        expect(session.getSnapshot().saveState).toBe('saved');
    });

    it('stops after three failures, preserves edits and starts three new attempts only on manual retry', async () => {
        const save = vi
            .fn()
            .mockRejectedValue(new DocumentSaveError('offline', true));
        const { session } = createSession(save);
        session.change('private draft');
        const cycle = session.save();
        await vi.advanceTimersByTimeAsync(3000);
        expect(await cycle).toBe(false);
        expect(save).toHaveBeenCalledTimes(3);
        expect(session.getSnapshot()).toMatchObject({
            draft: 'private draft',
            saveState: 'failed',
        });
        session.change('edited after failure');
        await vi.advanceTimersByTimeAsync(60000);
        expect(save).toHaveBeenCalledTimes(3);
        expect(await session.flush()).toBe(false);
        expect(save).toHaveBeenCalledTimes(3);
        const retry = session.save();
        await vi.advanceTimersByTimeAsync(3000);
        expect(await retry).toBe(false);
        expect(save).toHaveBeenCalledTimes(6);
        expect(save.mock.calls[3]).toEqual([document, 'edited after failure']);
    });

    it('does not automatically retry a conflict, expired session or unknown local failure', async () => {
        const { session, save } = createSession(
            vi.fn().mockRejectedValue(new DocumentSaveError('Reabra a nota.')),
        );
        session.change('pending');
        expect(await session.save()).toBe(false);
        await vi.advanceTimersByTimeAsync(60000);
        expect(save).toHaveBeenCalledTimes(1);
        expect(session.getSnapshot()).toMatchObject({
            error: 'Reabra a nota.',
            draft: 'pending',
            saveState: 'failed',
        });
    });

    it('does not claim a reverted draft is saved after a failed or ambiguous acknowledgement', async () => {
        const { session, save } = createSession(
            vi.fn().mockRejectedValue(new DocumentSaveError('Reabra a nota.')),
        );
        session.change('possibly stored');
        expect(await session.save()).toBe(false);
        session.change('original');
        expect(session.hasPendingChanges()).toBe(true);
        expect(session.getSnapshot().saveState).toBe('failed');
        expect(await session.flush()).toBe(false);
        await vi.advanceTimersByTimeAsync(60000);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('shares one in-flight cycle across automatic, manual and navigation requests', async () => {
        const request = deferred<OpenedDocument>();
        const { session, save } = createSession(vi.fn(() => request.promise));
        session.change('pending');
        const first = session.save();
        const second = session.save();
        const exit = session.flush();
        expect(first).toBe(second);
        await vi.advanceTimersByTimeAsync(15000);
        expect(save).toHaveBeenCalledTimes(1);
        request.resolve({ ...document, content: 'pending', revision: 2 });
        expect(await first).toBe(true);
        expect(await exit).toBe(true);
    });

    it('preserves typing during a request and uses the confirmed revision on the next save', async () => {
        const request = deferred<OpenedDocument>();
        const save = vi
            .fn()
            .mockReturnValueOnce(request.promise)
            .mockImplementation(
                async (note: OpenedDocument, content: string) => ({
                    ...note,
                    content,
                    revision: note.revision + 1,
                }),
            );
        const { session } = createSession(save);
        session.change('first');
        const cycle = session.save();
        await vi.advanceTimersByTimeAsync(1000);
        session.change('latest');
        request.resolve({ ...document, content: 'first', revision: 2 });
        await cycle;
        expect(session.getSnapshot()).toMatchObject({
            draft: 'latest',
            document: { content: 'first', revision: 2 },
            saveState: 'pending',
        });
        await vi.advanceTimersByTimeAsync(1499);
        expect(save).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(save.mock.calls[1]).toEqual([
            { ...document, content: 'first', revision: 2 },
            'latest',
        ]);
        expect(session.getSnapshot()).toMatchObject({
            draft: 'latest',
            document: { content: 'latest', revision: 3 },
            saveState: 'saved',
        });
    });

    it('flushes all edits made during the request before allowing navigation', async () => {
        const request = deferred<OpenedDocument>();
        const save = vi
            .fn()
            .mockReturnValueOnce(request.promise)
            .mockImplementation(
                async (note: OpenedDocument, content: string) => ({
                    ...note,
                    content,
                    revision: note.revision + 1,
                }),
            );
        const { session } = createSession(save);
        session.change('first');
        const exit = session.flush();
        await vi.advanceTimersByTimeAsync(0);
        session.change('latest');
        request.resolve({ ...document, content: 'first', revision: 2 });
        expect(await exit).toBe(true);
        expect(save).toHaveBeenCalledTimes(2);
        expect(session.getSnapshot().document?.content).toBe('latest');
    });

    it('saves an undo performed while an older draft is in flight instead of silently losing it', async () => {
        const request = deferred<OpenedDocument>();
        const save = vi
            .fn()
            .mockReturnValueOnce(request.promise)
            .mockImplementation(
                async (note: OpenedDocument, content: string) => ({
                    ...note,
                    content,
                    revision: note.revision + 1,
                }),
            );
        const { session } = createSession(save);
        session.change('first');
        const cycle = session.save();
        await vi.advanceTimersByTimeAsync(0);
        session.change('original');
        expect(session.hasPendingChanges()).toBe(true);
        request.resolve({ ...document, content: 'first', revision: 2 });
        await cycle;
        await vi.advanceTimersByTimeAsync(1500);
        expect(save.mock.calls[1][1]).toBe('original');
        expect(session.hasPendingChanges()).toBe(false);
    });

    it('cancels the debounce when an edit is reverted before sending', async () => {
        const { session, save } = createSession();
        session.change('first');
        session.change('original');
        await vi.advanceTimersByTimeAsync(1500);
        expect(save).not.toHaveBeenCalled();
        expect(session.getSnapshot().saveState).toBe('saved');
    });

    it('refuses to replace or close a dirty document and drops drafts when a new session is created', () => {
        const { session } = createSession();
        session.change('secret');
        expect(session.open({ ...document, id: 'other' })).toBe(false);
        session.close();
        expect(session.getSnapshot().draft).toBe('secret');
        session.dispose();
        const next = createSession().session;
        expect(next.getSnapshot().draft).toBe('original');
    });

    it('cancels timers on disposal and does not retry a late failed request', async () => {
        const save = vi
            .fn()
            .mockRejectedValue(new DocumentSaveError('offline', true));
        const { session } = createSession(save);
        session.change('private');
        const cycle = session.save();
        await vi.advanceTimersByTimeAsync(0);
        session.dispose();
        await vi.advanceTimersByTimeAsync(60000);
        expect(await cycle).toBe(false);
        expect(save).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});
