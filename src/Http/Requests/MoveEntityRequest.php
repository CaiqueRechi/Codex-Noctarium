<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MoveEntityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_context_id' => ['required', 'uuid'],
            'to_context_id' => ['required', 'uuid'],
        ];
    }
}
