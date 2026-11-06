import { useEffect, useMemo, useState } from 'react';

import {
    flattenContexts,
    type UniverseSummary,
} from '../explorer/vault-explorer';
import type { PerspectiveFilters, PerspectiveSummary } from './types';

type PerspectivesPanelProps = {
    perspectives: PerspectiveSummary[];
    activePerspectiveId: string | null;
    universes: UniverseSummary[];
    onSelect: (perspectiveId: string) => void;
    onCreate: (
        name: string,
        sourcePerspectiveId: string | null,
        filters: PerspectiveFilters,
    ) => Promise<void>;
    onUpdate: (
        perspectiveId: string,
        name: string,
        filters: PerspectiveFilters,
    ) => Promise<void>;
    onCreateVersion: (name: string) => Promise<void>;
    onRestoreVersion: (versionId: string) => Promise<void>;
};

export function PerspectivesPanel({
    perspectives,
    activePerspectiveId,
    universes,
    onSelect,
    onCreate,
    onUpdate,
    onCreateVersion,
    onRestoreVersion,
}: PerspectivesPanelProps) {
    const activePerspective = perspectives.find(
        (perspective) => perspective.id === activePerspectiveId,
    );
    const [name, setName] = useState(activePerspective?.name ?? '');
    const [newName, setNewName] = useState('');
    const [contextIds, setContextIds] = useState<string[]>(
        activePerspective?.filters.contextIds ?? [],
    );
    const [entityTypes, setEntityTypes] = useState(
        activePerspective?.filters.entityTypes.join(', ') ?? '',
    );
    const [versionName, setVersionName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const contexts = useMemo(() => flattenContexts(universes), [universes]);

    useEffect(() => {
        setName(activePerspective?.name ?? '');
        setContextIds(activePerspective?.filters.contextIds ?? []);
        setEntityTypes(activePerspective?.filters.entityTypes.join(', ') ?? '');
        setError(null);
    }, [activePerspective]);

    const filters = (): PerspectiveFilters => ({
        contextIds,
        entityTypes: entityTypes
            .split(',')
            .map((value) => value.trim())
            .filter(
                (value, index, values) =>
                    Boolean(value) && values.indexOf(value) === index,
            ),
    });

    const run = async (operation: () => Promise<void>) => {
        setIsSaving(true);
        setError(null);

        try {
            await operation();
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível atualizar a perspectiva.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="cvc-perspectives" aria-label="Perspectivas">
            <header>
                <span className="cvc-eyebrow">Visão</span>
                <h3>Perspectivas</h3>
            </header>

            <label>
                <span>Perspectiva ativa</span>
                <select
                    aria-label="Perspectiva ativa"
                    value={activePerspectiveId ?? ''}
                    onChange={(event) => onSelect(event.target.value)}
                >
                    {perspectives.map((perspective) => (
                        <option key={perspective.id} value={perspective.id}>
                            {perspective.name}
                        </option>
                    ))}
                </select>
            </label>

            {activePerspective && (
                <>
                    <label>
                        <span>Nome</span>
                        <input
                            aria-label="Nome da perspectiva"
                            value={name}
                            maxLength={120}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </label>
                    <fieldset>
                        <legend>Contextos visíveis</legend>
                        {contexts.map((context) => (
                            <label
                                key={context.id}
                                className="cvc-perspectives__check"
                            >
                                <input
                                    type="checkbox"
                                    checked={contextIds.includes(context.id)}
                                    onChange={(event) =>
                                        setContextIds((current) =>
                                            event.target.checked
                                                ? [...current, context.id]
                                                : current.filter(
                                                      (id) => id !== context.id,
                                                  ),
                                        )
                                    }
                                />
                                <span>{context.name}</span>
                            </label>
                        ))}
                        <small>Nenhum marcado exibe todos.</small>
                    </fieldset>
                    <label>
                        <span>Tipos de entidade</span>
                        <input
                            aria-label="Tipos de entidade"
                            value={entityTypes}
                            placeholder="referência, ideia"
                            onChange={(event) =>
                                setEntityTypes(event.target.value)
                            }
                        />
                    </label>
                    <button
                        type="button"
                        className="cvc-button cvc-button--compact"
                        disabled={isSaving || name.trim() === ''}
                        onClick={() =>
                            void run(() =>
                                onUpdate(
                                    activePerspective.id,
                                    name.trim(),
                                    filters(),
                                ),
                            )
                        }
                    >
                        Salvar perspectiva
                    </button>
                </>
            )}

            <label>
                <span>Nova perspectiva</span>
                <input
                    aria-label="Nome da nova perspectiva"
                    value={newName}
                    maxLength={120}
                    onChange={(event) => setNewName(event.target.value)}
                />
            </label>
            <div className="cvc-perspectives__actions">
                <button
                    type="button"
                    className="cvc-button cvc-button--compact"
                    disabled={isSaving || newName.trim() === ''}
                    onClick={() =>
                        void run(async () => {
                            await onCreate(newName.trim(), null, filters());
                            setNewName('');
                        })
                    }
                >
                    Criar manual
                </button>
                <button
                    type="button"
                    className="cvc-button cvc-button--compact"
                    disabled={
                        isSaving ||
                        newName.trim() === '' ||
                        activePerspectiveId === null
                    }
                    onClick={() =>
                        void run(async () => {
                            await onCreate(
                                newName.trim(),
                                activePerspectiveId,
                                filters(),
                            );
                            setNewName('');
                        })
                    }
                >
                    Derivar atual
                </button>
            </div>

            {error && (
                <p className="cvc-properties__error" role="alert">
                    {error}
                </p>
            )}

            {activePerspective && (
                <section className="cvc-versions" aria-label="Versões">
                    <h4>Versões</h4>
                    <label>
                        <span>Nome da versão</span>
                        <input
                            aria-label="Nome da versão"
                            value={versionName}
                            maxLength={120}
                            onChange={(event) =>
                                setVersionName(event.target.value)
                            }
                        />
                    </label>
                    <button
                        type="button"
                        className="cvc-button cvc-button--compact"
                        disabled={isSaving || versionName.trim() === ''}
                        onClick={() =>
                            void run(async () => {
                                await onCreateVersion(versionName.trim());
                                setVersionName('');
                            })
                        }
                    >
                        Criar versão
                    </button>
                    <ul>
                        {(activePerspective.versions ?? []).map((version) => (
                            <li key={version.id}>
                                <span>
                                    <strong>{version.name}</strong>
                                    <small>
                                        {version.kind === 'recovery'
                                            ? 'Recuperação automática'
                                            : 'Versão nomeada'}
                                    </small>
                                </span>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() =>
                                        void run(() =>
                                            onRestoreVersion(version.id),
                                        )
                                    }
                                >
                                    Restaurar
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </section>
    );
}
