import { useEffect, useState, useSyncExternalStore } from 'react';

import { DocumentAutosave } from './document-autosave';
import { requestDocumentSave } from './save-request';

export function useDocumentAutosave(endpoint: string) {
    const [session] = useState(
        () =>
            new DocumentAutosave((document, content) =>
                requestDocumentSave(endpoint, document, content),
            ),
    );
    const snapshot = useSyncExternalStore(
        session.subscribe,
        session.getSnapshot,
        session.getSnapshot,
    );

    useEffect(() => {
        session.activate();

        return session.dispose;
    }, [session]);

    return { session, ...snapshot };
}
