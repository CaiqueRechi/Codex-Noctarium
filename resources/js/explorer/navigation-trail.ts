import type { ContextBreadcrumb } from './vault-explorer';

// The server builds breadcrumbs by walking up parent contexts, and the space
// of a note's subnotes has no parent: a note can sit in several spaces. The
// way into such a space is known only to the page, so the trail it shows
// continues from the one it had.
export function continueTrail(
    previous: readonly ContextBreadcrumb[],
    arriving: readonly ContextBreadcrumb[],
    { entering }: { entering: boolean },
): ContextBreadcrumb[] {
    const first = arriving[0];

    if (!first) {
        return [...arriving];
    }

    const known = previous.findIndex((crumb) => crumb.id === first.id);

    if (known >= 0) {
        return [...previous.slice(0, known), ...arriving];
    }

    return entering ? [...previous, ...arriving] : [...arriving];
}
