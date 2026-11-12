<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateWorkspaceStateRequest extends FormRequest
{
    // Must accept every zoom the canvas allows: zoomLimits in resources/js/pages/vault.tsx.
    private const MINIMUM_ZOOM = 0.01;

    private const MAXIMUM_ZOOM = 100;

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
            'viewport.zoom' => ['required', 'numeric', 'between:'.self::MINIMUM_ZOOM.','.self::MAXIMUM_ZOOM],
            'focus_entity_id' => ['nullable', 'uuid'],
            'focus_context_id' => ['nullable', 'uuid'],
            'perspective_id' => ['nullable', 'uuid'],
        ];
    }
}
