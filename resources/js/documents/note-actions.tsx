import { useEffect, useState } from 'react';

import { openContextSlice } from '../contexts/api';
import type { ContextSummary } from '../explorer/vault-explorer';
import type { DeletionOutcome } from '../trash/types';

type Destination = { id: string; name: string };

export type NoteActionsProps = {
    placeCount: number;
    contextsEndpoint: string;
    currentContextId: string;
    onMove: (toContextId: string) => Promise<void>;
    onRemoveHere: () => Promise<void>;
    onDelete: (withSubnotes: boolean) => Promise<DeletionOutcome>;
};

type Step =
    | { kind: 'idle' }
    | { kind: 'moving' }
    | { kind: 'choosing-removal' }
    | { kind: 'confirming-subnotes'; subnotes: number };

/**
 * RF-08 and D-13: move a note, take it out of this space only, or send it
 * to the trash, asking first whenever the answer changes what is lost.
 */
export function NoteActions({
    placeCount,
    contextsEndpoint,
    currentContextId,
    onMove,
    onRemoveHere,
    onDelete,
}: NoteActionsProps) {
    const [step, setStep] = useState<Step>({ kind: 'idle' });
    const [error, setError] = useState<string | null>(null);

    const run = async (action: () => Promise<void>) => {
        try {
            await action();
            setError(null);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível concluir a ação.',
            );
        }
    };

    const remove = (withSubnotes: boolean) =>
        run(async () => {
            const outcome = await onDelete(withSubnotes);

            setStep(
                outcome.kind === 'has-subnotes'
                    ? { kind: 'confirming-subnotes', subnotes: outcome.subnotes }
                    : { kind: 'idle' },
            );
        });

    return (
        <div className="cvc-note-actions">
            <div className="cvc-editor__actions">
                <button
                    type="button"
                    className="cvc-button"
                    aria-expanded={step.kind === 'moving'}
                    onClick={() =>
                        setStep(
                            step.kind === 'moving'
                                ? { kind: 'idle' }
                                : { kind: 'moving' },
                        )
                    }
                >
                    Mover para…
                </button>
                <button
                    type="button"
                    className="cvc-button cvc-button--danger"
                    onClick={() =>
                        placeCount > 1
                            ? setStep({ kind: 'choosing-removal' })
                            : void remove(false)
                    }
                >
                    Excluir
                </button>
            </div>

            {step.kind === 'moving' && (
                <DestinationPicker
                    contextsEndpoint={contextsEndpoint}
                    currentContextId={currentContextId}
                    onChoose={(destination) =>
                        void run(async () => {
                            await onMove(destination.id);
                            setStep({ kind: 'idle' });
                        })
                    }
                    onCancel={() => setStep({ kind: 'idle' })}
                />
            )}

            {step.kind === 'choosing-removal' && (
                <div className="cvc-note-actions__question" role="group" aria-label="Retirar a nota">
                    <p>Esta nota aparece em {placeCount} espaços.</p>
                    <button
                        type="button"
                        className="cvc-button"
                        onClick={() =>
                            void run(async () => {
                                await onRemoveHere();
                                setStep({ kind: 'idle' });
                            })
                        }
                    >
                        Só daqui
                    </button>
                    <button
                        type="button"
                        className="cvc-button cvc-button--danger"
                        onClick={() => void remove(false)}
                    >
                        De todos os lugares
                    </button>
                    <button
                        type="button"
                        className="cvc-button"
                        onClick={() => setStep({ kind: 'idle' })}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {step.kind === 'confirming-subnotes' && (
                <div className="cvc-note-actions__question" role="alertdialog" aria-label="Excluir com subnotas">
                    <p>
                        Esta nota tem {step.subnotes} subnota(s). Elas vão para
                        a lixeira junto, menos as que também estão em outro
                        espaço.
                    </p>
                    <button
                        type="button"
                        className="cvc-button cvc-button--danger"
                        onClick={() => void remove(true)}
                    >
                        Excluir com as subnotas
                    </button>
                    <button
                        type="button"
                        className="cvc-button"
                        onClick={() => setStep({ kind: 'idle' })}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {error && (
                <p className="cvc-note-title__error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

type DestinationPickerProps = {
    contextsEndpoint: string;
    currentContextId: string;
    onChoose: (destination: Destination) => void;
    onCancel: () => void;
};

// Walks the hierarchy one slice at a time, like the canvas, so the whole
// vault is never loaded to choose a destination.
function DestinationPicker({
    contextsEndpoint,
    currentContextId,
    onChoose,
    onCancel,
}: DestinationPickerProps) {
    const [trail, setTrail] = useState<Destination[]>([]);
    const [options, setOptions] = useState<ContextSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const here = trail.at(-1) ?? null;

    useEffect(() => {
        let isCurrent = true;

        openContextSlice(contextsEndpoint, here?.id ?? null)
            .then((slice) => {
                if (!isCurrent) {
                    return;
                }

                setOptions(
                    here === null
                        ? slice.contexts
                        : (slice.contexts[0]?.contexts ?? []),
                );
                setError(null);
            })
            .catch((exception: unknown) => {
                if (isCurrent) {
                    setError(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível listar os destinos.',
                    );
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [contextsEndpoint, here]);

    return (
        <div className="cvc-move-picker" role="dialog" aria-label="Mover para…">
            <p className="cvc-eyebrow">
                {trail.length === 0
                    ? 'Escolha o destino'
                    : trail.map((step) => step.name).join(' → ')}
            </p>
            <ul className="cvc-move-picker__list">
                {trail.length > 0 && (
                    <li>
                        <button
                            type="button"
                            className="cvc-button"
                            onClick={() => setTrail((current) => current.slice(0, -1))}
                        >
                            ← Voltar um nível
                        </button>
                    </li>
                )}
                {options.map((option) => (
                    <li key={option.id} className="cvc-move-picker__option">
                        <button
                            type="button"
                            className="cvc-move-picker__open"
                            onClick={() =>
                                setTrail((current) => [
                                    ...current,
                                    { id: option.id, name: option.name },
                                ])
                            }
                        >
                            {option.name}
                        </button>
                    </li>
                ))}
            </ul>
            {error && <p role="alert">{error}</p>}
            <div className="cvc-editor__actions">
                <button
                    type="button"
                    className="cvc-button cvc-button--primary"
                    disabled={here === null || here.id === currentContextId}
                    onClick={() => here && onChoose(here)}
                >
                    {here ? `Mover para ${here.name}` : 'Mover'}
                </button>
                <button type="button" className="cvc-button" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}
