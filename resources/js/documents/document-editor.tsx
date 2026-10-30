import type { OpenedDocument, SaveState } from './types';

type DocumentEditorProps = {
    document: OpenedDocument;
    draft: string;
    saveState: SaveState;
    error: string | null;
    onChange: (content: string) => void;
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
    document,
    draft,
    saveState,
    error,
    onChange,
    onSave,
    onBack,
}: DocumentEditorProps) {
    const isSaving = saveState === 'saving';
    const hasPendingChanges = draft !== document.content;

    return (
        <section className="cvc-editor" aria-label="Editor Markdown">
            <header className="cvc-editor__header">
                <div>
                    <span className="cvc-eyebrow">Documento</span>
                    <h2>{document.title ?? 'Sem título'}</h2>
                </div>
                <div className="cvc-editor__actions">
                    <output
                        className="cvc-save-state"
                        data-state={saveState}
                        aria-live="polite"
                    >
                        {statusLabels[saveState]}
                    </output>
                    <button
                        type="button"
                        className="cvc-button cvc-button--primary"
                        disabled={isSaving || !hasPendingChanges}
                        onClick={onSave}
                    >
                        Salvar
                    </button>
                    <button
                        type="button"
                        className="cvc-button"
                        disabled={isSaving || hasPendingChanges}
                        onClick={onBack}
                    >
                        Voltar ao canvas
                    </button>
                </div>
            </header>

            {error && (
                <p className="cvc-editor__error" role="alert">
                    {error} O conteúdo continua neste editor.
                </p>
            )}

            <textarea
                className="cvc-editor__textarea"
                aria-label="Conteúdo Markdown"
                autoFocus
                spellCheck
                value={draft}
                onChange={(event) => onChange(event.target.value)}
            />
        </section>
    );
}
