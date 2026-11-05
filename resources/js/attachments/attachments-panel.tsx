import { useState } from 'react';

import type { DocumentSummary } from '../documents/types';
import { uploadAttachment } from './api';
import type { AttachmentSummary } from './types';

type AttachmentsPanelProps = {
    document: DocumentSummary;
    entitiesEndpoint: string;
    attachmentsEndpoint: string;
    onUploaded: (attachment: AttachmentSummary) => void;
};

export function AttachmentsPanel({
    document,
    entitiesEndpoint,
    attachmentsEndpoint,
    onUploaded,
}: AttachmentsPanelProps) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const attachments = document.attachments ?? [];

    const upload = async () => {
        if (!file) {
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const attachment = await uploadAttachment(
                entitiesEndpoint,
                document.id,
                file,
            );
            onUploaded(attachment);
            setFile(null);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível anexar o arquivo.',
            );
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section className="cvc-attachments" aria-label="Anexos">
            <header>
                <span className="cvc-eyebrow">Arquivos privados</span>
                <h3>Anexos</h3>
            </header>
            <input
                type="file"
                aria-label="Selecionar anexo"
                accept=".gif,.jpeg,.jpg,.pdf,.png,.webp"
                disabled={isUploading}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
                type="button"
                className="cvc-button cvc-button--compact"
                disabled={!file || isUploading}
                onClick={() => void upload()}
            >
                {isUploading ? 'Enviando…' : 'Anexar'}
            </button>
            {error && <p role="alert">{error}</p>}
            {attachments.length === 0 ? (
                <p>Nenhum anexo.</p>
            ) : (
                <ul>
                    {attachments.map((attachment) => (
                        <li key={attachment.id}>
                            <a
                                href={`${attachmentsEndpoint}/${encodeURIComponent(attachment.id)}`}
                                download={attachment.name}
                            >
                                {attachment.name}
                            </a>
                            <span>
                                {(attachment.sizeBytes / 1024).toFixed(1)} KB
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
