<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Versions;

use CrowVaultCanvas\Domain\Knowledge\Models\Perspective;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;
use Illuminate\Support\Facades\DB;

final readonly class CreateVaultVersion
{
    public function __construct(
        private CaptureVaultSnapshot $captureSnapshot,
        private SnapshotCodec $snapshotCodec,
    ) {}

    public function handle(
        string $perspectiveId,
        string $name,
        string $createdBy,
        string $kind = VaultVersion::KIND_NAMED,
    ): VaultVersion {
        return DB::transaction(function () use ($perspectiveId, $name, $createdBy, $kind): VaultVersion {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $perspective = Perspective::query()
                ->whereKey($perspectiveId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();
            $snapshot = $this->captureSnapshot->handle($perspective);

            return VaultVersion::query()->create([
                'vault_id' => $vaultId,
                'perspective_id' => $perspective->getKey(),
                'name' => $name,
                'kind' => $kind,
                'created_by' => $createdBy,
                'snapshot' => $snapshot,
                'snapshot_hash' => $this->snapshotCodec->hash($snapshot),
            ]);
        }, 3);
    }
}
