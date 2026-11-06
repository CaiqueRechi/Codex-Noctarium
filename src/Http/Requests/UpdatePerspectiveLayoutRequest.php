<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePerspectiveLayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'position' => ['required', 'array:x,y'],
            'position.x' => ['required', 'numeric', 'between:-10000000,10000000'],
            'position.y' => ['required', 'numeric', 'between:-10000000,10000000'],
            'pinned' => ['required', 'boolean'],
        ];
    }
}
