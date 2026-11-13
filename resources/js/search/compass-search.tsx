import { useEffect, useId, useState } from 'react';

import { searchVault } from './api';
import type { SearchResult } from './api';
import { groupCompassResults } from './compass-groups';

type CompassSearchProps = {
    endpoint: string;
    currentUniverseId: string | null;
    canReturn: boolean;
    onChoose: (result: SearchResult) => void;
    onReturn: () => void;
};

const searchDelay = 250;
const minimumQuery = 2;

// RF-07: a small compass in a lower corner opens a floating side panel to
// search the whole vault.
export function CompassSearch({
    endpoint,
    currentUniverseId,
    canReturn,
    onChoose,
    onReturn,
}: CompassSearchProps) {
    const panelId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const text = query.trim();

        if (text.length < minimumQuery) {
            setResults([]);
            setMessage(null);

            return;
        }

        let isCurrent = true;
        const timer = window.setTimeout(() => {
            searchVault(endpoint, text, '', '', '')
                .then((found) => {
                    if (!isCurrent) {
                        return;
                    }

                    setResults(found);
                    setMessage(
                        found.length === 0 ? `Nada encontrado para “${text}”.` : null,
                    );
                })
                .catch((exception: unknown) => {
                    if (isCurrent) {
                        setMessage(
                            exception instanceof Error
                                ? exception.message
                                : 'Não foi possível pesquisar.',
                        );
                    }
                });
        }, searchDelay);

        return () => {
            isCurrent = false;
            window.clearTimeout(timer);
        };
    }, [endpoint, query]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', closeOnEscape);

        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [isOpen]);

    const choose = (result: SearchResult) => {
        setIsOpen(false);
        onChoose(result);
    };

    const groups = groupCompassResults(results, currentUniverseId);
    const renderList = (list: SearchResult[], showPath: boolean) => (
        <ul className="cvc-compass__results">
            {list.map((result) => (
                <li key={`${result.id}:${result.contextId}`}>
                    <button
                        type="button"
                        className="cvc-compass__result"
                        onClick={() => choose(result)}
                    >
                        <span>{result.title ?? 'Sem título'}</span>
                        {showPath && result.path && result.path.length > 0 && (
                            <small>
                                {result.path.map((step) => step.name).join(' → ')}
                            </small>
                        )}
                        {result.snippet && (
                            <small className="cvc-compass__snippet">
                                {result.snippet}
                            </small>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <div className="cvc-overlay cvc-overlay--compass">
                <button
                    type="button"
                    className="cvc-button cvc-compass__toggle"
                    aria-label={isOpen ? 'Fechar pesquisa' : 'Pesquisar no vault'}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 3 14 12 12 21 10 12Z" />
                        <path d="M3 12 12 10 21 12 12 14Z" />
                    </svg>
                </button>
                {canReturn && (
                    <button
                        type="button"
                        className="cvc-button cvc-compass__return"
                        onClick={onReturn}
                    >
                        Voltar
                    </button>
                )}
            </div>
            <aside
                id={panelId}
                className="cvc-compass"
                aria-label="Pesquisa"
                hidden={!isOpen}
            >
                <label className="cvc-eyebrow" htmlFor={`${panelId}-query`}>
                    Pesquisar no vault
                </label>
                <input
                    id={`${panelId}-query`}
                    className="cvc-input"
                    type="search"
                    autoComplete="off"
                    placeholder="Título, texto, tag…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <p className="cvc-compass__status" role="status">
                    {message ?? ''}
                </p>
                {groups.kind === 'single' ? (
                    renderList(groups.results, true)
                ) : (
                    <>
                        {groups.here.length > 0 && (
                            <section aria-label="Neste universo">
                                <h3 className="cvc-eyebrow">Neste universo</h3>
                                {renderList(groups.here, false)}
                            </section>
                        )}
                        {groups.elsewhere.length > 0 && (
                            <section aria-label="Outros universos">
                                <h3 className="cvc-eyebrow">Outros universos</h3>
                                {renderList(groups.elsewhere, true)}
                            </section>
                        )}
                    </>
                )}
            </aside>
        </>
    );
}
