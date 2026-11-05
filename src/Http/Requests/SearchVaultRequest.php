<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SearchVaultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'context_id' => [
                'nullable',
                'uuid',
                Rule::exists('cvc_contexts', 'id')->where(
                    fn ($query) => $query
                        ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                        ->whereNull('deleted_at'),
                ),
            ],
            'entity_type' => ['nullable', 'string', 'max:64'],
            'tag' => ['nullable', 'string', 'max:64'],
        ];
    }
}
