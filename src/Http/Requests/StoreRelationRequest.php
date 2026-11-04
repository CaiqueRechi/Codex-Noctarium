<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreRelationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source_entity_id' => ['required', 'uuid'],
            'target_entity_id' => [
                'required',
                'uuid',
                Rule::notIn([(string) $this->input('source_entity_id')]),
            ],
            'context_id' => ['present', 'nullable', 'uuid'],
            'type' => ['present', 'nullable', 'string', 'max:64'],
            'directed' => ['required', 'boolean'],
            'properties' => ['present', 'array', 'max:20'],
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
                    $validator->errors()->add('properties', 'A relação contém uma chave inválida.');
                }

                if (! is_scalar($value) && $value !== null) {
                    $validator->errors()->add("properties.{$key}", 'A relação contém um valor inválido.');
                }
            }
        });
    }
}
