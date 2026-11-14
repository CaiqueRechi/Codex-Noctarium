import { useState } from 'react';
import type { KeyboardEvent } from 'react';

type NoteTitleFieldProps = {
    title: string | null;
    onRename: (title: string) => Promise<void>;
};

const titleLimit = 120;

// The title saves when the field is left or Enter is pressed; Escape puts
// back the saved title. An empty title is refused instead of sent.
export function NoteTitleField({ title, onRename }: NoteTitleFieldProps) {
    const [value, setValue] = useState(title ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const commit = async () => {
        const next = value.trim();

        if (next === (title ?? '')) {
            setError(null);

            return;
        }

        if (next === '') {
            setError('Dê um nome à nota.');

            return;
        }

        setIsSaving(true);

        try {
            await onRename(next);
            setError(null);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível renomear a nota.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        }

        if (event.key === 'Escape') {
            setValue(title ?? '');
            setError(null);
        }
    };

    return (
        <div className="cvc-note-title">
            <label className="cvc-eyebrow" htmlFor="cvc-note-title">
                Nome da nota
            </label>
            <input
                id="cvc-note-title"
                className="cvc-note-title__input"
                value={value}
                maxLength={titleLimit}
                placeholder="Sem título"
                aria-invalid={error !== null}
                aria-describedby={error ? 'cvc-note-title-error' : undefined}
                aria-busy={isSaving}
                onChange={(event) => setValue(event.target.value)}
                onBlur={() => void commit()}
                onKeyDown={handleKeyDown}
            />
            {error && (
                <p
                    id="cvc-note-title-error"
                    className="cvc-note-title__error"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
