<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge;

/**
 * RF-02: the colors a note may take. A note stores the name of a tone, not
 * a color value, so a change of theme (RN-20) repaints every note; the
 * values live in the preset as --cvc-note-<name>.
 */
enum NoteColor: string
{
    case Void = 'vazio';
    case Energy = 'energia';
    case Champagne = 'champanhe';
    case Nebula = 'nebulosa';
    case Aurora = 'aurora';
    case Ember = 'brasa';
}
