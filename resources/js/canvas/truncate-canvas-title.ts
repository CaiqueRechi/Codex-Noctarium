const maximumTitleCharacters = 20;
const titleSegments = new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
});

export function truncateCanvasTitle(title: string): string {
    let visibleTitle = '';
    let characterCount = 0;

    for (const { segment } of titleSegments.segment(title)) {
        if (characterCount === maximumTitleCharacters) {
            return `${visibleTitle}…`;
        }

        visibleTitle += segment;
        characterCount++;
    }

    return visibleTitle;
}
