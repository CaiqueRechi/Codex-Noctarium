import { useEffect, useState } from 'react';

import { findLinkTargets } from './api';
import type { LinkTarget } from './api';

// Typing pauses this long before asking the server, so a word typed fast
// costs one request, not one per letter.
const lookupDelay = 150;

// The notes a link may go to for the text typed so far; null asks nothing.
export function useLinkTargets(
    endpoint: string,
    query: string | null,
    exceptEntityId: string,
) {
    const [targets, setTargets] = useState<LinkTarget[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (query === null || query.trim() === '') {
            setTargets([]);
            setMessage(null);

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            findLinkTargets(endpoint, query, exceptEntityId, controller.signal)
                .then((found) => {
                    setTargets(found);
                    setMessage(
                        found.length === 0
                            ? `Nenhuma nota começa com “${query.trim()}”.`
                            : null,
                    );
                })
                .catch((exception: unknown) => {
                    if (controller.signal.aborted) {
                        return;
                    }

                    setTargets([]);
                    setMessage(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível buscar as notas.',
                    );
                });
        }, lookupDelay);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [endpoint, exceptEntityId, query]);

    return { targets, message, setMessage };
}
