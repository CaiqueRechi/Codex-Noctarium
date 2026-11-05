import { useState } from 'react';

import type { DocumentSummary } from '../documents/types';
import type { TrashItem } from './types';

type TrashPanelProps = {
    focusedDocument: DocumentSummary | null;
    items: TrashItem[];
    notice: string | null;
    onDelete: (entityId: string) => Promise<void>;
    onRestore: (entityId: string) => Promise<void>;
};

export function TrashPanel({
    focusedDocument,
    items,
    notice,
    onDelete,
    onRestore,
}: TrashPanelProps) {
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (entityId: string, action: () => Promise<void>) => {
        setPendingId(entityId);
        setError(null);

        try {
            await action();
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível atualizar a lixeira.',
            );
        } finally {
            setPendingId(null);
        }
    };

    return (
        <section className="cvc-trash" aria-label="Lixeira">
            <header>
                <span className="cvc-eyebrow">Recuperação</span>
                <h3>Lixeira</h3>
            </header>
            {focusedDocument && (
                <button
                    type="button"
                    className="cvc-button cvc-button--compact"
                    disabled={pendingId !== null}
                    onClick={() => {
                        if (
                            window.confirm(
                                'Mover esta entidade e suas relações para a lixeira?',
                            )
                        ) {
                            void run(focusedDocument.id, () =>
                                onDelete(focusedDocument.id),
                            );
                        }
                    }}
                >
                    Mover selecionado para a lixeira
                </button>
            )}
            {notice && <p role="status">{notice}</p>}
            {error && <p role="alert">{error}</p>}
            {items.length === 0 ? (
                <p>Nenhuma entidade removida.</p>
            ) : (
                <ul>
                    {items.map((item) => (
                        <li key={item.id}>
                            <span>{item.title ?? 'Sem título'}</span>
                            <button
                                type="button"
                                className="cvc-button cvc-button--compact"
                                disabled={pendingId !== null}
                                onClick={() =>
                                    void run(item.id, () => onRestore(item.id))
                                }
                            >
                                Restaurar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
