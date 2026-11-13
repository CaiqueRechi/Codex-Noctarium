<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RenameEntityRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('title'))) {
            $this->merge(['title' => trim($this->input('title'))]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    // 120 like a context name, because a note that stands for a context
    // carries its title over to that context's name.
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
        ];
    }
}
