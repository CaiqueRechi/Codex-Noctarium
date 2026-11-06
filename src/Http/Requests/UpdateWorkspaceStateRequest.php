<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateWorkspaceStateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'viewport.x' => ['required', 'numeric', 'between:-10000000,10000000'],
            'viewport.y' => ['required', 'numeric', 'between:-10000000,10000000'],
            'viewport.zoom' => ['required', 'numeric', 'between:0.25,2'],
            'focus_entity_id' => ['nullable', 'uuid'],
            'focus_context_id' => ['nullable', 'uuid'],
            'perspective_id' => ['nullable', 'uuid'],
        ];
    }
}
