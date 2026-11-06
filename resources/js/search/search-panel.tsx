import { useMemo, useState } from 'react';

import {
    flattenContexts,
    type UniverseSummary,
} from '../explorer/vault-explorer';
import { searchVault } from './api';
import type { SearchResult } from './api';

type SearchPanelProps = {
    endpoint: string;
    universes: UniverseSummary[];
    onSelect: (entityId: string, contextId: string) => void;
};

export function SearchPanel({
    endpoint,
    universes,
    onSelect,
}: SearchPanelProps) {
    const [query, setQuery] = useState('');
    const [contextId, setContextId] = useState('');
    const [entityType, setEntityType] = useState('');
    const [tag, setTag] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const contexts = useMemo(() => flattenContexts(universes), [universes]);

    const search = async () => {
        if (query.trim().length < 2) {
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            setResults(
                await searchVault(
                    endpoint,
                    query.trim(),
                    contextId,
                    entityType.trim(),
                    tag.trim(),
                ),
            );
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível buscar no vault.',
            );
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <section className="cvc-search" aria-label="Busca e filtros">
            <header>
                <span className="cvc-eyebrow">Encontrar</span>
                <h3>Busca</h3>
            </header>
            <input
                type="search"
                aria-label="Buscar no vault"
                value={query}
                minLength={2}
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        void search();
                    }
                }}
            />
            <select
                aria-label="Filtrar busca por contexto"
                value={contextId}
                onChange={(event) => setContextId(event.target.value)}
            >
                <option value="">Todos os contextos</option>
                {contexts.map((context) => (
                    <option key={context.id} value={context.id}>
                        {context.name}
                    </option>
                ))}
            </select>
            <input
                aria-label="Filtrar busca por tipo"
                value={entityType}
                maxLength={64}
                placeholder="Tipo"
                onChange={(event) => setEntityType(event.target.value)}
            />
            <input
                aria-label="Filtrar busca por tag"
                value={tag}
                maxLength={64}
                placeholder="Tag"
                onChange={(event) => setTag(event.target.value)}
            />
            <button
                type="button"
                className="cvc-button cvc-button--compact"
                disabled={isSearching || query.trim().length < 2}
                onClick={() => void search()}
            >
                {isSearching ? 'Buscando…' : 'Buscar'}
            </button>
            {error && <p role="alert">{error}</p>}
            <ul>
                {results.map((result) => (
                    <li key={result.id}>
                        <button
                            type="button"
                            onClick={() =>
                                onSelect(result.id, result.contextId)
                            }
                        >
                            <strong>{result.title ?? 'Sem título'}</strong>
                            <span>
                                {result.snippet ||
                                    'Correspondência em metadados'}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
