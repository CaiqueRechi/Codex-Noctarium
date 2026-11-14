<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use CrowVaultCanvas\Domain\Knowledge\NoteColor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class PaintEntityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // null takes the color away, back to the theme's default.
    public function rules(): array
    {
        return [
            'color' => [
                'present',
                Rule::requiredIf($this->input('color') !== null),
                'nullable',
                'string',
                Rule::enum(NoteColor::class),
            ],
        ];
    }
}
