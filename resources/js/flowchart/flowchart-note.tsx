import { useMemo } from 'react';

import { FlowchartEditor } from './flowchart-editor';
import { parseFlowchart, serializeFlowchart } from './flowchart';

type FlowchartNoteProps = {
    content: string;
    onChange: (content: string) => void;
};

// The body of a flowchart note: its description, kept from the text it had
// as a normal note, above the diagram.
export function FlowchartNote({ content, onChange }: FlowchartNoteProps) {
    const chart = useMemo(() => parseFlowchart(content), [content]);

    return (
        <div className="cvc-flowchart-note">
            <textarea
                className="cvc-flowchart-note__description"
                aria-label="Descrição do fluxograma"
                placeholder="Descrição"
                value={chart.description}
                onChange={(event) =>
                    onChange(
                        serializeFlowchart({
                            ...chart,
                            description: event.target.value,
                        }),
                    )
                }
            />
            <FlowchartEditor
                chart={chart}
                onChange={(next) => onChange(serializeFlowchart(next))}
            />
        </div>
    );
}
