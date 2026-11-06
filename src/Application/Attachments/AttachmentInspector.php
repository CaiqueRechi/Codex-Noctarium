<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

use finfo;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;

final class AttachmentInspector
{
    public const MAX_BYTES = 5 * 1024 * 1024;

    /** @var array<string, array{mime: string, canonical: string}> */
    private const ALLOWED_TYPES = [
        'gif' => ['mime' => 'image/gif', 'canonical' => 'gif'],
        'jpeg' => ['mime' => 'image/jpeg', 'canonical' => 'jpg'],
        'jpg' => ['mime' => 'image/jpeg', 'canonical' => 'jpg'],
        'pdf' => ['mime' => 'application/pdf', 'canonical' => 'pdf'],
        'png' => ['mime' => 'image/png', 'canonical' => 'png'],
        'webp' => ['mime' => 'image/webp', 'canonical' => 'webp'],
    ];

    public function inspect(UploadedFile $file): InspectedAttachment
    {
        $path = $file->getRealPath();
        $size = $file->getSize();

        if ($path === false || ! is_file($path) || $size === false || $size < 1 || $size > self::MAX_BYTES) {
            throw new InvalidArgumentException('O anexo deve ter entre 1 byte e 5 MB.');
        }

        $originalName = basename(str_replace('\\', '/', $file->getClientOriginalName()));

        if ($originalName === '' || mb_strlen($originalName) > 255 || preg_match('/[\x00-\x1F\x7F]/', $originalName) === 1) {
            throw new InvalidArgumentException('O nome do anexo é inválido.');
        }

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $expected = self::ALLOWED_TYPES[$extension] ?? null;

        if ($expected === null) {
            throw new InvalidArgumentException('A extensão do anexo não é permitida.');
        }

        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($path);

        if ($mimeType === false || ! hash_equals($expected['mime'], $mimeType)) {
            throw new InvalidArgumentException('A extensão e o MIME real do anexo não correspondem.');
        }

        $this->assertSignature($path, $mimeType);
        $contentHash = hash_file('sha256', $path);

        if ($contentHash === false) {
            throw new InvalidArgumentException('O anexo não pôde ser verificado.');
        }

        return new InspectedAttachment(
            $originalName,
            $expected['canonical'],
            $mimeType,
            $size,
            $contentHash,
        );
    }

    private function assertSignature(string $path, string $mimeType): void
    {
        $prefix = file_get_contents($path, false, null, 0, 16);

        if ($prefix === false) {
            throw new InvalidArgumentException('A assinatura do anexo não pôde ser lida.');
        }

        $valid = match ($mimeType) {
            'image/gif' => str_starts_with($prefix, 'GIF87a') || str_starts_with($prefix, 'GIF89a'),
            'image/jpeg' => str_starts_with($prefix, "\xFF\xD8\xFF"),
            'image/png' => str_starts_with($prefix, "\x89PNG\r\n\x1A\n"),
            'image/webp' => substr($prefix, 0, 4) === 'RIFF' && substr($prefix, 8, 4) === 'WEBP',
            'application/pdf' => $this->hasValidPdfEnvelope($path, $prefix),
            default => false,
        };

        if (! $valid) {
            throw new InvalidArgumentException('A assinatura real do anexo é inválida.');
        }

        if (str_starts_with($mimeType, 'image/')) {
            $image = @getimagesize($path);

            if ($image === false || ! isset($image['mime']) || ! hash_equals($mimeType, $image['mime'])) {
                throw new InvalidArgumentException('A estrutura da imagem é inválida.');
            }
        }
    }

    private function hasValidPdfEnvelope(string $path, string $prefix): bool
    {
        if (! str_starts_with($prefix, '%PDF-')) {
            return false;
        }

        $size = filesize($path);

        if ($size === false) {
            return false;
        }

        $tail = file_get_contents($path, false, null, max(0, $size - 1024));

        return $tail !== false && str_contains($tail, '%%EOF');
    }
}
