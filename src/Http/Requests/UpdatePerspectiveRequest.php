<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePerspectiveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'filters' => ['required', 'array:context_ids,entity_types'],
            'filters.context_ids' => ['present', 'array', 'max:50'],
            'filters.context_ids.*' => ['required', 'uuid', 'distinct'],
            'filters.entity_types' => ['present', 'array', 'max:20'],
            'filters.entity_types.*' => ['required', 'string', 'max:64', 'distinct'],
        ];
    }
}
