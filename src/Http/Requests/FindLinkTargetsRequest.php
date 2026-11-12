<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class FindLinkTargetsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prefix' => ['required', 'string', 'max:120'],
            'except' => ['nullable', 'uuid'],
        ];
    }
}
