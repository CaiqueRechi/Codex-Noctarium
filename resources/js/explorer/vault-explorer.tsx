import {
    contextNodeId,
    entityNodeId,
    universeNodeId,
} from '../canvas/node-identifiers';
import type { DocumentSummary } from '../documents/types';

export type ContextSummary = {
    id: string;
    name: string;
    documents: DocumentSummary[];
};

export type UniverseSummary = {
    id: string;
    name: string;
    contexts: ContextSummary[];
};

export type ExplorerTarget = {
    nodeId: string;
    entityId: string | null;
    kind: 'universe' | 'context' | 'document';
};

type VaultExplorerProps = {
    universes: UniverseSummary[];
    onLocate: (target: ExplorerTarget) => void;
};

export function VaultExplorer({ universes, onLocate }: VaultExplorerProps) {
    return (
        <aside className="cvc-explorer" aria-label="Explorador do vault">
            <header className="cvc-explorer__header">
                <span className="cvc-eyebrow">Navegação</span>
                <h2>Explorador</h2>
            </header>

            <ul className="cvc-explorer__tree">
                {universes.map((universe) => (
                    <li key={universe.id}>
                        <button
                            type="button"
                            className="cvc-explorer__item"
                            data-kind="universe"
                            onClick={() =>
                                onLocate({
                                    nodeId: universeNodeId(universe.id),
                                    entityId: null,
                                    kind: 'universe',
                                })
                            }
                        >
                            <span>Universo</span>
                            <strong>{universe.name}</strong>
                        </button>

                        <ul>
                            {universe.contexts.map((context) => (
                                <li key={context.id}>
                                    <button
                                        type="button"
                                        className="cvc-explorer__item"
                                        data-kind="context"
                                        onClick={() =>
                                            onLocate({
                                                nodeId: contextNodeId(
                                                    context.id,
                                                ),
                                                entityId: null,
                                                kind: 'context',
                                            })
                                        }
                                    >
                                        <span>Contexto</span>
                                        <strong>{context.name}</strong>
                                    </button>

                                    <ul>
                                        {context.documents.map((document) => (
                                            <li key={document.id}>
                                                <button
                                                    type="button"
                                                    className="cvc-explorer__item"
                                                    data-kind="document"
                                                    onClick={() =>
                                                        onLocate({
                                                            nodeId: entityNodeId(
                                                                context.id,
                                                                document.id,
                                                            ),
                                                            entityId:
                                                                document.id,
                                                            kind: 'document',
                                                        })
                                                    }
                                                >
                                                    <span>Documento</span>
                                                    <strong>
                                                        {document.title ??
                                                            'Sem título'}
                                                    </strong>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
