<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateContextRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'parent_id' => ['present', 'nullable', 'uuid'],
        ];
    }
}
