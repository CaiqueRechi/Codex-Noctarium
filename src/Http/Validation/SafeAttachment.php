<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Http\Validation;

use Closure;
use CrowVaultCanvas\Application\Attachments\AttachmentInspector;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;

final readonly class SafeAttachment implements ValidationRule
{
    public function __construct(private AttachmentInspector $inspector) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile) {
            $fail('O anexo enviado é inválido.');

            return;
        }

        try {
            $this->inspector->inspect($value);
        } catch (InvalidArgumentException $exception) {
            $fail($exception->getMessage());
        }
    }
}
