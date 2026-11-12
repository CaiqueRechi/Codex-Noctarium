import { ContentTypeSwitch } from '../flowchart/content-type-switch';
import { isFlowchartContent } from '../flowchart/flowchart';
import { FlowchartNote } from '../flowchart/flowchart-note';
import { LinkingTextarea } from './linking-textarea';
import { NoteActions } from './note-actions';
import type { NoteActionsProps } from './note-actions';
import { NoteColorPicker } from './note-color-picker';
import type { NoteColorName } from './note-color-picker';
import { NoteConnections } from './note-connections';
import { NoteTitleField } from './note-title-field';
import type { OpenedDocument, SaveState } from './types';
import type { RelationSummary } from '../relations/types';

type DocumentEditorProps = {
    linking?: {
        targetsEndpoint: string;
        relations: readonly RelationSummary[];
        onLink: (targetEntityId: string) => Promise<void>;
        onRemove: (relationId: string) => Promise<void>;
    };
    document: OpenedDocument;
    draft: string;
    saveState: SaveState;
    error: string | null;
    onChange: (content: string) => void;
    onRename: (title: string) => Promise<void>;
    color: string | null;
    onPaint: (color: NoteColorName | null) => Promise<void>;
    actions?: NoteActionsProps;
    onSave: () => void;
    onBack: () => void;
};

const statusLabels: Record<SaveState, string> = {
    pending: 'Alterações pendentes',
    saving: 'Salvando…',
    saved: 'Salvo',
    failed: 'Falhou',
};

export function DocumentEditor({
    linking,
    document,
    draft,
    saveState,
    error,
    onChange,
    onRename,
    color,
    onPaint,
    actions,
    onSave,
    onBack,
}: DocumentEditorProps) {
    const isFlowchart = isFlowchartContent(draft);
    const isSaving = saveState === 'saving';
    const hasPendingChanges =
        draft !== document.content || saveState === 'failed';

    return (
        <section
            className="cvc-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Editor de nota"
        >
            <header className="cvc-editor__header">
                <NoteTitleField title={document.title} onRename={onRename} />
                <NoteColorPicker color={color} onPaint={onPaint} />
                <ContentTypeSwitch content={draft} onChange={onChange} />
                {actions && <NoteActions {...actions} />}
                <div className="cvc-editor__actions">
                    <output
                        className="cvc-save-state"
                        data-state={saveState}
                        aria-live="polite"
                        aria-busy={isSaving}
                    >
                        <span
                            className="cvc-save-state__icon"
                            aria-hidden="true"
                        >
                            ↻
                        </span>{' '}
                        {statusLabels[saveState]}
                    </output>
                    <button
                        type="button"
                        className="cvc-button cvc-button--primary"
                        disabled={isSaving || !hasPendingChanges}
                        onClick={onSave}
                    >
                        {saveState === 'failed' ? 'Tentar novamente' : 'Salvar'}
                    </button>
                    <button
                        type="button"
                        className="cvc-button"
                        autoFocus={isFlowchart}
                        onClick={onBack}
                    >
                        Voltar ao canvas
                    </button>
                </div>
            </header>

            {error && (
                <p className="cvc-editor__error" role="alert">
                    {error} Existem alterações não salvas apenas nesta aba.
                    Fechar ou recarregar pode perder essas alterações.
                </p>
            )}

            {linking && (
                <NoteConnections
                    noteId={document.id}
                    relations={linking.relations}
                    targetsEndpoint={linking.targetsEndpoint}
                    onLink={linking.onLink}
                    onRemove={linking.onRemove}
                />
            )}

            {isFlowchart ? (
                <FlowchartNote content={draft} onChange={onChange} />
            ) : linking ? (
                <LinkingTextarea
                    value={draft}
                    entityId={document.id}
                    linkTargetsEndpoint={linking.targetsEndpoint}
                    onChange={onChange}
                    onLink={linking.onLink}
                />
            ) : (
                <textarea
                    className="cvc-editor__textarea"
                    aria-label="Conteúdo Markdown"
                    autoFocus
                    spellCheck
                    value={draft}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </section>
    );
}
