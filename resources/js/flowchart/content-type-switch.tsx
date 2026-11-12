import { useState } from 'react';

import { isFlowchartContent, parseFlowchart } from './flowchart';
import { convertToFlowchart, convertToNormalNote } from './mermaid';

type ContentTypeSwitchProps = {
    content: string;
    onChange: (content: string) => void;
};

/**
 * RF-04 and RF-05: the type of a note changes while it is edited. A normal
 * note becomes a flowchart keeping its text as description; a flowchart
 * becomes a normal note only after the user chooses to keep the diagram as
 * text or to discard it.
 */
export function ContentTypeSwitch({ content, onChange }: ContentTypeSwitchProps) {
    const isFlowchart = isFlowchartContent(content);
    const [isChoosing, setIsChoosing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toFlowchart = () => {
        const conversion = convertToFlowchart(content);

        if (!conversion.ok) {
            setError(conversion.error);

            return;
        }

        setError(null);
        onChange(conversion.content);
    };

    const toNormal = (keepAsText: boolean) => {
        setIsChoosing(false);
        setError(null);
        onChange(convertToNormalNote(parseFlowchart(content), keepAsText));
    };

    return (
        <div className="cvc-content-type">
            <div role="radiogroup" aria-label="Tipo de conteúdo" className="cvc-content-type__options">
                <button
                    type="button"
                    role="radio"
                    aria-checked={!isFlowchart}
                    className="cvc-button"
                    onClick={() => isFlowchart && setIsChoosing(true)}
                >
                    Nota
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={isFlowchart}
                    className="cvc-button"
                    onClick={() => !isFlowchart && toFlowchart()}
                >
                    Fluxograma
                </button>
            </div>
            {isChoosing && (
                <div className="cvc-note-actions__question" role="alertdialog" aria-label="Voltar para nota">
                    <p>O que fazer com o fluxograma?</p>
                    <button type="button" className="cvc-button" onClick={() => toNormal(true)}>
                        Transformar em texto
                    </button>
                    <button
                        type="button"
                        className="cvc-button cvc-button--danger"
                        onClick={() => toNormal(false)}
                    >
                        Apagar o fluxograma
                    </button>
                    <button type="button" className="cvc-button" onClick={() => setIsChoosing(false)}>
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
