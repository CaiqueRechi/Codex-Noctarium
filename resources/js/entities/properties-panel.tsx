import { useState } from 'react';

import type { DocumentSummary } from '../documents/types';
import type { EntityProperties } from './types';

type PropertyDraft = {
    key: string;
    value: string;
};

type PropertiesPanelProps = {
    document: DocumentSummary | null;
    onSave: (
        entityType: string | null,
        properties: EntityProperties,
    ) => Promise<void>;
};

function draftsFrom(document: DocumentSummary | null): PropertyDraft[] {
    if (!document) {
        return [];
    }

    return Object.entries(document.properties).map(([key, value]) => ({
        key,
        value: value === null ? '' : String(value),
    }));
}

export function PropertiesPanel({ document, onSave }: PropertiesPanelProps) {
    const [entityType, setEntityType] = useState(document?.entityType ?? '');
    const [properties, setProperties] = useState<PropertyDraft[]>(() =>
        draftsFrom(document),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateProperty = (
        index: number,
        field: keyof PropertyDraft,
        value: string,
    ) => {
        setProperties((current) =>
            current.map((property, propertyIndex) =>
                propertyIndex === index
                    ? { ...property, [field]: value }
                    : property,
            ),
        );
        setError(null);
    };

    const save = async () => {
        const namedProperties = properties.filter(
            (property) => property.key.trim() !== '',
        );
        const normalizedKeys = namedProperties.map((property) =>
            property.key.trim(),
        );

        if (new Set(normalizedKeys).size !== normalizedKeys.length) {
            setError('Cada propriedade precisa ter um nome único.');

            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(
                entityType.trim() === '' ? null : entityType.trim(),
                Object.fromEntries(
                    namedProperties.map((property) => [
                        property.key.trim(),
                        property.value,
                    ]),
                ),
            );
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível salvar as propriedades.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <aside className="cvc-properties" aria-label="Propriedades da entidade">
            <header className="cvc-properties__header">
                <span className="cvc-eyebrow">Entidade</span>
                <h2>Propriedades</h2>
            </header>

            {!document ? (
                <p className="cvc-properties__empty">
                    Selecione um documento para estruturar suas propriedades.
                </p>
            ) : (
                <div className="cvc-properties__form">
                    <label>
                        <span>Tipo</span>
                        <input
                            type="text"
                            value={entityType}
                            maxLength={64}
                            onChange={(event) =>
                                setEntityType(event.target.value)
                            }
                            placeholder="Ex.: projeto"
                        />
                    </label>

                    <div className="cvc-properties__list">
                        {properties.map((property, index) => (
                            <div
                                className="cvc-properties__row"
                                key={`${document.id}:${index}`}
                            >
                                <label>
                                    <span>Nome {index + 1}</span>
                                    <input
                                        type="text"
                                        value={property.key}
                                        maxLength={64}
                                        onChange={(event) =>
                                            updateProperty(
                                                index,
                                                'key',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    <span>Valor {index + 1}</span>
                                    <input
                                        type="text"
                                        value={property.value}
                                        maxLength={2000}
                                        onChange={(event) =>
                                            updateProperty(
                                                index,
                                                'value',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="cvc-button cvc-button--compact"
                                    aria-label={`Remover propriedade ${index + 1}`}
                                    onClick={() =>
                                        setProperties((current) =>
                                            current.filter(
                                                (_, propertyIndex) =>
                                                    propertyIndex !== index,
                                            ),
                                        )
                                    }
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="cvc-button"
                        onClick={() =>
                            setProperties((current) => [
                                ...current,
                                { key: '', value: '' },
                            ])
                        }
                    >
                        Adicionar propriedade
                    </button>

                    {error && (
                        <p className="cvc-properties__error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        className="cvc-button cvc-button--primary"
                        disabled={isSaving}
                        onClick={() => void save()}
                    >
                        {isSaving ? 'Salvando…' : 'Salvar propriedades'}
                    </button>
                </div>
            )}
        </aside>
    );
}
