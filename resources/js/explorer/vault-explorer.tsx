import { useState } from 'react';

import {
    contextNodeId,
    entityNodeId,
    universeNodeId,
} from '../canvas/node-identifiers';
import type { DocumentSummary } from '../documents/types';

export type ContextSummary = {
    id: string;
    parentId: string | null;
    kind: 'universe' | 'context';
    name: string;
    hasChildren: boolean;
    documents: DocumentSummary[];
    contexts: ContextSummary[];
};

export type UniverseSummary = ContextSummary;

export type ContextBreadcrumb = {
    id: string;
    name: string;
};

export type ExplorerTarget = {
    nodeId: string;
    entityId: string | null;
    kind: 'universe' | 'context' | 'document';
};

type VaultExplorerProps = {
    universes: UniverseSummary[];
    breadcrumbs: ContextBreadcrumb[];
    onLocate: (target: ExplorerTarget) => void;
    onOpenContext: (contextId: string | null) => Promise<void>;
    onCreateContext: (name: string) => Promise<void>;
};

export function flattenContexts(
    universes: UniverseSummary[],
): ContextSummary[] {
    return universes.flatMap((context) => [
        context,
        ...flattenContexts(context.contexts),
    ]);
}

export function updateContext(
    universes: UniverseSummary[],
    contextId: string,
    update: (context: ContextSummary) => ContextSummary,
): UniverseSummary[] {
    return universes.map((context) => {
        const next = context.id === contextId ? update(context) : context;

        return {
            ...next,
            contexts: updateContext(next.contexts, contextId, update),
        };
    });
}

export function mapDocuments(
    universes: UniverseSummary[],
    update: (document: DocumentSummary) => DocumentSummary | null,
): UniverseSummary[] {
    return universes.map((context) => ({
        ...context,
        documents: context.documents
            .map(update)
            .filter(
                (document): document is DocumentSummary => document !== null,
            ),
        contexts: mapDocuments(context.contexts, update),
    }));
}

export function VaultExplorer({
    universes,
    breadcrumbs,
    onLocate,
    onOpenContext,
    onCreateContext,
}: VaultExplorerProps) {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeContextId = breadcrumbs.at(-1)?.id ?? null;

    const createContext = async () => {
        const normalizedName = name.trim();

        if (normalizedName === '') {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onCreateContext(normalizedName);
            setName('');
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível criar o assunto.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <aside className="cvc-explorer" aria-label="Explorador do vault">
            <header className="cvc-explorer__header">
                <span className="cvc-eyebrow">Navegação</span>
                <h2>Explorador</h2>
            </header>

            <nav className="cvc-breadcrumbs" aria-label="Caminho atual">
                <button type="button" onClick={() => void onOpenContext(null)}>
                    Vault
                </button>
                {breadcrumbs.map((breadcrumb) => (
                    <button
                        type="button"
                        key={breadcrumb.id}
                        onClick={() => void onOpenContext(breadcrumb.id)}
                    >
                        {breadcrumb.name}
                    </button>
                ))}
            </nav>

            <div className="cvc-explorer__create">
                <label>
                    <span>
                        {activeContextId === null
                            ? 'Novo universo'
                            : 'Novo subassunto'}
                    </span>
                    <input
                        value={name}
                        maxLength={120}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                void createContext();
                            }
                        }}
                    />
                </label>
                <button
                    type="button"
                    className="cvc-button cvc-button--compact"
                    disabled={isSaving || name.trim() === ''}
                    onClick={() => void createContext()}
                >
                    {isSaving ? 'Criando…' : 'Criar'}
                </button>
                {error && <p role="alert">{error}</p>}
            </div>

            <ul className="cvc-explorer__tree">
                {universes.map((universe) => (
                    <li key={universe.id}>
                        <ContextItem
                            context={universe}
                            isUniverse
                            onLocate={onLocate}
                            onOpenContext={onOpenContext}
                        />

                        <ul>
                            {universe.contexts.map((context) => (
                                <li key={context.id}>
                                    <ContextItem
                                        context={context}
                                        onLocate={onLocate}
                                        onOpenContext={onOpenContext}
                                    />
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

type ContextItemProps = {
    context: ContextSummary;
    isUniverse?: boolean;
    onLocate: (target: ExplorerTarget) => void;
    onOpenContext: (contextId: string) => Promise<void>;
};

function ContextItem({
    context,
    isUniverse = false,
    onLocate,
    onOpenContext,
}: ContextItemProps) {
    return (
        <>
            <div className="cvc-explorer__context-row">
                <button
                    type="button"
                    className="cvc-explorer__item"
                    data-kind={isUniverse ? 'universe' : 'context'}
                    onClick={() =>
                        onLocate({
                            nodeId: isUniverse
                                ? universeNodeId(context.id)
                                : contextNodeId(context.id),
                            entityId: null,
                            kind: isUniverse ? 'universe' : 'context',
                        })
                    }
                >
                    <span>{isUniverse ? 'Universo' : 'Assunto'}</span>
                    <strong>{context.name}</strong>
                </button>
                <button
                    type="button"
                    className="cvc-explorer__open"
                    onClick={() => void onOpenContext(context.id)}
                >
                    Entrar
                </button>
            </div>

            {context.documents.length > 0 && (
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
                                        entityId: document.id,
                                        kind: 'document',
                                    })
                                }
                            >
                                <span>Documento</span>
                                <strong>
                                    {document.title ?? 'Sem título'}
                                </strong>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
