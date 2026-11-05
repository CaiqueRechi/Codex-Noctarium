import { useCallback, useEffect, useState } from 'react';

import { fetchOperationalTasks } from './api';
import type { OperationalSaveState, OperationalTask } from './types';

type OperationalStatusPanelProps = {
    endpoint: string;
    initialTasks: OperationalTask[];
    saveState: OperationalSaveState;
};

const saveLabels: Record<Exclude<OperationalSaveState, null>, string> = {
    pending: 'Documento com alterações pendentes',
    saving: 'Documento sendo salvo',
    saved: 'Documento salvo',
    failed: 'Falha ao salvar; conteúdo mantido no editor',
};

const taskLabels: Record<OperationalTask['status'], string> = {
    pending: 'Aguardando',
    running: 'Em andamento',
    succeeded: 'Concluída',
    failed: 'Falhou',
    attention: 'Requer atenção',
};

export function OperationalStatusPanel({
    endpoint,
    initialTasks,
    saveState,
}: OperationalStatusPanelProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);

        try {
            setTasks(await fetchOperationalTasks(endpoint));
            setError(null);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível atualizar o estado operacional.',
            );
        } finally {
            setIsRefreshing(false);
        }
    }, [endpoint]);

    useEffect(() => {
        const timer = window.setInterval(() => void refresh(), 10_000);

        return () => window.clearInterval(timer);
    }, [refresh]);

    return (
        <section className="cvc-operations" aria-label="Estado operacional">
            <header className="cvc-operations__header">
                <div>
                    <span className="cvc-eyebrow">Operação</span>
                    <h3>Estado operacional</h3>
                </div>
                <button
                    type="button"
                    className="cvc-button cvc-button--compact"
                    disabled={isRefreshing}
                    onClick={() => void refresh()}
                >
                    {isRefreshing ? 'Atualizando…' : 'Atualizar'}
                </button>
            </header>

            <output
                className="cvc-operation-save"
                data-state={saveState ?? 'idle'}
                aria-live="polite"
            >
                {saveState ? saveLabels[saveState] : 'Nenhum documento em edição'}
            </output>

            {error && (
                <p className="cvc-properties__error" role="alert">
                    {error} O estado anterior foi mantido.
                </p>
            )}

            {tasks.length === 0 ? (
                <p className="cvc-properties__empty">Nenhuma tarefa de fila registrada.</p>
            ) : (
                <ul className="cvc-operation-list">
                    {tasks.slice(0, 5).map((task) => (
                        <li key={task.id} data-state={task.status}>
                            <div>
                                <strong>{taskLabels[task.status]}</strong>
                                <span>{task.message}</span>
                            </div>
                            <small>
                                {task.progressCurrent}/{task.progressTotal}
                            </small>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
