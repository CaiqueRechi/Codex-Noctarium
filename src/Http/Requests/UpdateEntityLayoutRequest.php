<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateEntityLayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'position.x' => ['required', 'numeric', 'between:-100000,100000'],
            'position.y' => ['required', 'numeric', 'between:-100000,100000'],
            'pinned' => ['required', 'boolean'],
        ];
    }
}
