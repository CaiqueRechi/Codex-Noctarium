<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateEntityPropertiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'type' => ['present', 'nullable', 'string', 'max:64'],
            'properties' => ['present', 'array', 'max:50'],
            'tags' => ['sometimes', 'array', 'max:30'],
            'tags.*' => ['required', 'string', 'max:64', 'distinct'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $properties = $this->input('properties');

            if (! is_array($properties)) {
                return;
            }

            if ($properties !== [] && array_is_list($properties)) {
                $validator->errors()->add('properties', 'As propriedades devem formar um objeto.');

                return;
            }

            foreach ($properties as $key => $value) {
                if (! is_string($key) || preg_match('/\A[\pL\pN][\pL\pN _.\-]{0,63}\z/u', $key) !== 1) {
                    $validator->errors()->add(
                        'properties',
                        'Cada propriedade deve ter uma chave válida de até 64 caracteres.',
                    );
                }

                if (! is_scalar($value) && $value !== null) {
                    $validator->errors()->add(
                        "properties.{$key}",
                        'O valor deve ser texto, número, booleano ou nulo.',
                    );
                }

                if (is_string($value) && mb_strlen($value) > 2000) {
                    $validator->errors()->add(
                        "properties.{$key}",
                        'O valor não pode exceder 2000 caracteres.',
                    );
                }
            }
        });
    }
}
