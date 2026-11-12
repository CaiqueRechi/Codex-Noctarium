import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

import type { RelationSummary } from '../relations/types';
import { useLinkTargets } from '../relations/use-link-targets';

type NoteConnectionsProps = {
    noteId: string;
    relations: readonly RelationSummary[];
    targetsEndpoint: string;
    onLink: (targetEntityId: string) => Promise<void>;
    onRemove: (relationId: string) => Promise<void>;
};

const listId = 'cvc-connect-suggestions';

type Connection = { relationId: string; title: string };

// The notes this one is connected to, whichever end it is on.
export function connectionsOf(
    noteId: string,
    relations: readonly RelationSummary[],
): Connection[] {
    return relations.flatMap((relation) => {
        if (relation.sourceEntityId === noteId) {
            return [
                {
                    relationId: relation.id,
                    title: relation.targetTitle ?? 'Sem título',
                },
            ];
        }

        if (relation.targetEntityId === noteId) {
            return [
                {
                    relationId: relation.id,
                    title: relation.sourceTitle ?? 'Sem título',
                },
            ];
        }

        return [];
    });
}

// D-12: the editor lists the note's connections, each removable, and a
// "Conectar a…" field that suggests targets the way /link does.
export function NoteConnections({
    noteId,
    relations,
    targetsEndpoint,
    onLink,
    onRemove,
}: NoteConnectionsProps) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const { targets, message } = useLinkTargets(
        targetsEndpoint,
        query,
        noteId,
    );
    const connections = connectionsOf(noteId, relations);

    useEffect(() => setActiveIndex(0), [targets]);

    const run = async (action: () => Promise<void>, failure: string) => {
        try {
            await action();
            setError(null);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : failure);
        }
    };

    const connect = (targetId: string) =>
        run(async () => {
            await onLink(targetId);
            setQuery('');
        }, 'Não foi possível ligar as notas.');

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (targets.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex(
                (index) => (index + step + targets.length) % targets.length,
            );
        } else if (event.key === 'Enter') {
            event.preventDefault();
            void connect(targets[activeIndex].id);
        } else if (event.key === 'Escape') {
            setQuery('');
        }
    };

    const isOpen = targets.length > 0;

    return (
        <section className="cvc-connections" aria-label="Conexões da nota">
            <h3 className="cvc-eyebrow">Conexões</h3>
            {connections.length === 0 ? (
                <p className="cvc-connections__empty">
                    Ligue esta nota a outra pelo campo abaixo ou com /link.
                </p>
            ) : (
                <ul className="cvc-connections__list">
                    {connections.map((connection) => (
                        <li
                            key={connection.relationId}
                            className="cvc-connections__item"
                        >
                            <span>{connection.title}</span>
                            <button
                                type="button"
                                className="cvc-connections__remove"
                                aria-label={`Remover conexão com ${connection.title}`}
                                onClick={() =>
                                    void run(
                                        () => onRemove(connection.relationId),
                                        'Não foi possível remover a conexão.',
                                    )
                                }
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="cvc-connections__field">
                <input
                    className="cvc-input"
                    role="combobox"
                    aria-label="Conectar a…"
                    placeholder="Conectar a…"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? listId : undefined}
                    aria-activedescendant={
                        isOpen ? `${listId}-${activeIndex}` : undefined
                    }
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {isOpen && (
                    <ul
                        id={listId}
                        className="cvc-linking__list"
                        role="listbox"
                        aria-label="Notas para conectar"
                    >
                        {targets.map((target, index) => (
                            <li
                                key={target.id}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                className="cvc-linking__option"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    void connect(target.id);
                                }}
                            >
                                <span>{target.title}</span>
                                {target.path.length > 0 && (
                                    <small>{target.path.join(' → ')}</small>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <p className="cvc-connections__status" role="status">
                {error ?? message ?? ''}
            </p>
        </section>
    );
}
