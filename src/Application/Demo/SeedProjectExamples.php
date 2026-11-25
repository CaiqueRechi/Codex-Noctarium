<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Demo;

use CrowVaultCanvas\Application\Contexts\CreateContext;
use CrowVaultCanvas\Application\Contexts\EnsureContextDocument;
use CrowVaultCanvas\Application\Documents\SaveDocument;
use CrowVaultCanvas\Application\Relations\CreateRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;

final readonly class SeedProjectExamples
{
    public function __construct(
        private ProjectExamples $examples,
        private CreateContext $createContext,
        private EnsureContextDocument $ensureDocument,
        private SaveDocument $saveDocument,
        private CreateRelation $createRelation,
        private DatabaseManager $database,
        private Repository $config,
    ) {}

    /** @return array{notes: int, links: int, skipped: int} */
    public function handle(): array
    {
        $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');

        return $this->database->transaction(function () use ($vaultId): array {
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $records = $this->database->table('cvc_demo_fixtures')
                ->where('vault_id', $vaultId)->pluck('record_id', 'fixture_key');
            $spaces = [];
            $owners = [];
            $result = ['notes' => 0, 'links' => 0, 'skipped' => 0];

            foreach ($this->examples->notes() as $key => $note) {
                $parent = $note['parent'];
                if ($parent !== null && ! isset($spaces[$parent])) {
                    $result['skipped']++;

                    continue;
                }

                $fixtureKey = 'note:'.$key;
                $existingId = $records->get($fixtureKey);
                if ($existingId !== null) {
                    $result['skipped']++;
                    $space = KnowledgeContext::query()->where('vault_id', $vaultId)->find($existingId);
                    $owner = $space?->noteSpace?->entity;
                    if ($owner !== null && $owner->vault_id === $vaultId && $owner->document !== null) {
                        $spaces[$key] = (string) $space->getKey();
                        $owners[$key] = (string) $owner->getKey();
                    }

                    continue;
                }

                $space = $this->createContext->handle($note['title'], $parent === null ? null : $spaces[$parent]);
                $document = $this->ensureDocument->handle((string) $space->getKey());
                $this->saveDocument->handle($document->id, $note['content'], $document->revision);
                $spaces[$key] = (string) $space->getKey();
                $owners[$key] = $document->id;
                $this->record($vaultId, $fixtureKey, $spaces[$key]);
                $result['notes']++;
            }

            foreach ([['noctarium', 'rechi-os'], ['integration', 'save-flow'], ['vault-stack', 'host-stack']] as [$from, $to]) {
                $key = 'link:'.$from.':'.$to;
                if ($records->has($key) || ! isset($owners[$from], $owners[$to])) {
                    $result['skipped']++;

                    continue;
                }

                [$first, $second] = [$owners[$from], $owners[$to]];
                $existing = KnowledgeRelation::withTrashed()->where('vault_id', $vaultId)
                    ->whereNull('context_id')->whereNull('relation_type')->where('is_directed', false)
                    ->where('source_entity_id', min($first, $second))
                    ->where('target_entity_id', max($first, $second))->first();
                if ($existing !== null) {
                    $this->record($vaultId, $key, (string) $existing->getKey());
                    $result['skipped']++;

                    continue;
                }

                $relation = $this->createRelation->handle($first, $second, null, null, false, []);
                $this->record($vaultId, $key, (string) $relation->getKey());
                $result['links']++;
            }

            return $result;
        });
    }

    private function record(string $vaultId, string $key, string $recordId): void
    {
        $this->database->table('cvc_demo_fixtures')->insert([
            'vault_id' => $vaultId,
            'fixture_key' => $key,
            'record_id' => $recordId,
        ]);
    }
}
