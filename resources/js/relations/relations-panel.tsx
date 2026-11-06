import { useMemo, useState } from 'react';

import type { DocumentSummary } from '../documents/types';
import {
    flattenContexts,
    type UniverseSummary,
} from '../explorer/vault-explorer';
import type { RelationSummary } from './types';

type RelationsPanelProps = {
    document: DocumentSummary;
    universes: UniverseSummary[];
    relations: RelationSummary[];
    onAttach: (contextId: string) => Promise<void>;
    onCreate: (
        targetEntityId: string,
        contextId: string | null,
        relationType: string | null,
        isDirected: boolean,
    ) => Promise<void>;
    onDelete: (relationId: string) => Promise<void>;
};

export function RelationsPanel({
    document,
    universes,
    relations,
    onAttach,
    onCreate,
    onDelete,
}: RelationsPanelProps) {
    const contexts = flattenContexts(universes);
    const documents = useMemo(
        () =>
            Array.from(
                new Map(
                    contexts
                        .flatMap((context) => context.documents)
                        .map((candidate) => [candidate.id, candidate]),
                ).values(),
            ),
        [contexts],
    );
    const currentContextIds = new Set(
        contexts
            .filter((context) =>
                context.documents.some(
                    (candidate) => candidate.id === document.id,
                ),
            )
            .map((context) => context.id),
    );
    const availableContexts = contexts.filter(
        (context) => !currentContextIds.has(context.id),
    );
    const entityRelations = relations.filter(
        (relation) =>
            relation.sourceEntityId === document.id ||
            relation.targetEntityId === document.id,
    );
    const [targetId, setTargetId] = useState('');
    const [contextId, setContextId] = useState('');
    const [relationType, setRelationType] = useState('');
    const [isDirected, setIsDirected] = useState(false);
    const [attachContextId, setAttachContextId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const run = async (operation: () => Promise<void>) => {
        setError(null);

        try {
            await operation();
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível concluir a operação.',
            );
        }
    };

    return (
        <section className="cvc-relations" aria-labelledby="relations-title">
            <h3 id="relations-title">Relações e contextos</h3>

            {availableContexts.length > 0 && (
                <div className="cvc-relations__form">
                    <label>
                        <span>Reutilizar em contexto</span>
                        <select
                            value={attachContextId}
                            onChange={(event) =>
                                setAttachContextId(event.target.value)
                            }
                        >
                            <option value="">Selecione</option>
                            {availableContexts.map((context) => (
                                <option key={context.id} value={context.id}>
                                    {context.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className="cvc-button"
                        disabled={attachContextId === ''}
                        onClick={() =>
                            void run(async () => {
                                await onAttach(attachContextId);
                                setAttachContextId('');
                            })
                        }
                    >
                        Adicionar ao contexto
                    </button>
                </div>
            )}

            <div className="cvc-relations__form">
                <label>
                    <span>Relacionar com</span>
                    <select
                        value={targetId}
                        onChange={(event) => setTargetId(event.target.value)}
                    >
                        <option value="">Selecione</option>
                        {documents
                            .filter((candidate) => candidate.id !== document.id)
                            .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {candidate.title ?? 'Sem título'}
                                </option>
                            ))}
                    </select>
                </label>
                <label>
                    <span>Escopo</span>
                    <select
                        value={contextId}
                        onChange={(event) => setContextId(event.target.value)}
                    >
                        <option value="">Global</option>
                        {contexts
                            .filter((context) =>
                                currentContextIds.has(context.id),
                            )
                            .map((context) => (
                                <option key={context.id} value={context.id}>
                                    {context.name}
                                </option>
                            ))}
                    </select>
                </label>
                <label>
                    <span>Tipo opcional</span>
                    <input
                        value={relationType}
                        maxLength={64}
                        onChange={(event) =>
                            setRelationType(event.target.value)
                        }
                    />
                </label>
                <label className="cvc-relations__checkbox">
                    <input
                        type="checkbox"
                        checked={isDirected}
                        onChange={(event) =>
                            setIsDirected(event.target.checked)
                        }
                    />
                    <span>Direcionada</span>
                </label>
                <button
                    type="button"
                    className="cvc-button"
                    disabled={targetId === ''}
                    onClick={() =>
                        void run(async () => {
                            await onCreate(
                                targetId,
                                contextId === '' ? null : contextId,
                                relationType.trim() === ''
                                    ? null
                                    : relationType.trim(),
                                isDirected,
                            );
                            setTargetId('');
                            setRelationType('');
                        })
                    }
                >
                    Criar relação
                </button>
            </div>

            <ul className="cvc-relations__list">
                {entityRelations.map((relation) => {
                    const otherId =
                        relation.sourceEntityId === document.id
                            ? relation.targetEntityId
                            : relation.sourceEntityId;
                    const other = documents.find(
                        (candidate) => candidate.id === otherId,
                    );

                    return (
                        <li key={relation.id}>
                            <span>
                                {relation.relationType ?? 'Relação'} ·{' '}
                                {other?.title ?? 'Sem título'}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    void run(() => onDelete(relation.id))
                                }
                            >
                                Remover
                            </button>
                        </li>
                    );
                })}
            </ul>

            {error && (
                <p className="cvc-properties__error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
