<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Requests;

use CrowVaultCanvas\Application\Attachments\AttachmentInspector;
use CrowVaultCanvas\Http\Validation\SafeAttachment;
use Illuminate\Foundation\Http\FormRequest;

final class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(AttachmentInspector $inspector): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:5120',
                new SafeAttachment($inspector),
            ],
        ];
    }
}
