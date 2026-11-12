import { useState } from 'react';

// The names the server accepts (NoteColor); their values live in the
// preset as --cvc-note-<name>, so a theme repaints every note.
export const noteColors = [
    { name: 'vazio', label: 'Vazio' },
    { name: 'energia', label: 'Energia' },
    { name: 'champanhe', label: 'Champanhe' },
    { name: 'nebulosa', label: 'Nebulosa' },
    { name: 'aurora', label: 'Aurora' },
    { name: 'brasa', label: 'Brasa' },
] as const;

export type NoteColorName = (typeof noteColors)[number]['name'];

type NoteColorPickerProps = {
    color: string | null;
    onPaint: (color: NoteColorName | null) => Promise<void>;
};

export function NoteColorPicker({ color, onPaint }: NoteColorPickerProps) {
    const [error, setError] = useState<string | null>(null);

    const paint = async (next: NoteColorName | null) => {
        try {
            await onPaint(next);
            setError(null);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível mudar a cor.',
            );
        }
    };

    return (
        <div className="cvc-note-color">
            <div
                role="radiogroup"
                aria-label="Cor da nota"
                className="cvc-note-color__options"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={color === null}
                    aria-label="Sem cor"
                    className="cvc-note-color__swatch"
                    data-color="none"
                    onClick={() => void paint(null)}
                />
                {noteColors.map((option) => (
                    <button
                        key={option.name}
                        type="button"
                        role="radio"
                        aria-checked={color === option.name}
                        aria-label={option.label}
                        title={option.label}
                        className="cvc-note-color__swatch"
                        data-color={option.name}
                        onClick={() => void paint(option.name)}
                    />
                ))}
            </div>
            {error && (
                <p className="cvc-note-title__error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
