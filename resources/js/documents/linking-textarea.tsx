import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { findLinkTargets } from '../relations/api';
import type { LinkTarget } from '../relations/api';
import { findLinkCommand, removeLinkCommand } from './link-command';
import type { LinkCommand } from './link-command';

type LinkingTextareaProps = {
    value: string;
    entityId: string;
    linkTargetsEndpoint: string;
    onChange: (content: string) => void;
    onLink: (targetEntityId: string) => Promise<void>;
};

// Typing pauses this long before asking the server, so a word typed fast
// costs one request, not one per letter.
const lookupDelay = 150;
const listId = 'cvc-link-suggestions';

export function LinkingTextarea({
    value,
    entityId,
    linkTargetsEndpoint,
    onChange,
    onLink,
}: LinkingTextareaProps) {
    const textarea = useRef<HTMLTextAreaElement | null>(null);
    const [command, setCommand] = useState<LinkCommand | null>(null);
    const [targets, setTargets] = useState<LinkTarget[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!command) {
            setTargets([]);

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            findLinkTargets(
                linkTargetsEndpoint,
                command.query,
                entityId,
                controller.signal,
            )
                .then((found) => {
                    setTargets(found);
                    setActiveIndex(0);
                    setMessage(
                        found.length === 0
                            ? `Nenhuma nota começa com “${command.query.trim()}”.`
                            : null,
                    );
                })
                .catch((exception: unknown) => {
                    if (controller.signal.aborted) {
                        return;
                    }

                    setTargets([]);
                    setMessage(
                        exception instanceof Error
                            ? exception.message
                            : 'Não foi possível buscar as notas.',
                    );
                });
        }, lookupDelay);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [command, entityId, linkTargetsEndpoint]);

    const readCommand = (element: HTMLTextAreaElement) => {
        const found = findLinkCommand(element.value, element.selectionStart);

        setCommand((current) =>
            current?.query === found?.query && current?.start === found?.start
                ? current
                : found,
        );

        if (!found) {
            setMessage(null);
        }
    };

    const choose = async (target: LinkTarget) => {
        if (!command) {
            return;
        }

        try {
            await onLink(target.id);
            onChange(removeLinkCommand(value, command));
            setCommand(null);
            setMessage(`Ligada a “${target.title}”.`);
        } catch (exception) {
            setMessage(
                exception instanceof Error
                    ? exception.message
                    : 'Não foi possível ligar as notas.',
            );
        }

        textarea.current?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (!command || targets.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex(
                (index) => (index + step + targets.length) % targets.length,
            );
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            void choose(targets[activeIndex]);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setCommand(null);
        }
    };

    const isOpen = command !== null && targets.length > 0;
    const repeatedTitles = new Set(
        targets
            .map((target) => target.title)
            .filter((title, index, all) => all.indexOf(title) !== index),
    );

    return (
        <div className="cvc-linking">
            <textarea
                ref={textarea}
                className="cvc-editor__textarea"
                aria-label="Conteúdo Markdown"
                aria-autocomplete="list"
                aria-controls={isOpen ? listId : undefined}
                aria-expanded={isOpen}
                aria-activedescendant={
                    isOpen ? `${listId}-${activeIndex}` : undefined
                }
                autoFocus
                spellCheck
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    readCommand(event.target);
                }}
                onSelect={(event) => readCommand(event.currentTarget)}
                onKeyDown={handleKeyDown}
            />
            {isOpen && (
                <ul
                    id={listId}
                    className="cvc-linking__list"
                    role="listbox"
                    aria-label="Notas para ligar"
                >
                    {targets.map((target, index) => (
                        <li
                            key={target.id}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            className="cvc-linking__option"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                void choose(target);
                            }}
                        >
                            <span>{target.title}</span>
                            {repeatedTitles.has(target.title) &&
                                target.path.length > 0 && (
                                    <small>{target.path.join(' → ')}</small>
                                )}
                        </li>
                    ))}
                </ul>
            )}
            <p className="cvc-linking__status" role="status">
                {message ?? ''}
            </p>
        </div>
    );
}
