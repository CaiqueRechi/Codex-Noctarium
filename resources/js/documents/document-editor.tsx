import { LinkingTextarea } from './linking-textarea';
import { NoteTitleField } from './note-title-field';
import type { OpenedDocument, SaveState } from './types';

type DocumentEditorProps = {
    linking?: {
        targetsEndpoint: string;
        onLink: (targetEntityId: string) => Promise<void>;
    };
    document: OpenedDocument;
    draft: string;
    saveState: SaveState;
    error: string | null;
    onChange: (content: string) => void;
    onRename: (title: string) => Promise<void>;
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
    onSave,
    onBack,
}: DocumentEditorProps) {
    const isSaving = saveState === 'saving';
    const hasPendingChanges =
        draft !== document.content || saveState === 'failed';

    return (
        <section className="cvc-editor" aria-label="Editor Markdown">
            <header className="cvc-editor__header">
                <NoteTitleField title={document.title} onRename={onRename} />
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

            {linking ? (
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
