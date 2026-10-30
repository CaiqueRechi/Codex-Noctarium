<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Application\OpenVault;
use CrowVaultCanvas\Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

final class VaultInitializationTest extends TestCase
{
    use RefreshDatabase;

    public function test_rf_01_initialization_creates_one_vault_and_one_universe_idempotently(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();
        $this->artisan('cvc:initialize')->assertSuccessful();

        $this->assertDatabaseCount('cvc_vaults', 1);
        $this->assertDatabaseCount('cvc_contexts', 1);
        $this->assertDatabaseHas('cvc_vaults', [
            'id' => config('crow-vault-canvas.vault.id'),
            'name' => 'Crow Vault Canvas',
        ]);
        $this->assertDatabaseHas('cvc_contexts', [
            'kind' => 'universe',
            'name' => 'Meu Universo',
            'parent_id' => null,
        ]);
    }

    public function test_rf_01_opening_the_vault_returns_its_initial_universe(): void
    {
        $this->artisan('cvc:initialize')->assertSuccessful();

        $vault = $this->app->make(OpenVault::class)->handle();

        self::assertSame(config('crow-vault-canvas.vault.id'), $vault->getKey());
        self::assertCount(1, $vault->universes);
        self::assertSame('Meu Universo', $vault->universes->first()?->name);
    }

    public function test_vault_migration_can_be_rolled_back_and_reapplied(): void
    {
        self::assertTrue(Schema::hasTable('cvc_vaults'));
        self::assertTrue(Schema::hasTable('cvc_contexts'));

        $this->artisan('migrate:rollback')->assertSuccessful();

        self::assertFalse(Schema::hasTable('cvc_contexts'));
        self::assertFalse(Schema::hasTable('cvc_vaults'));

        $this->artisan('migrate')->assertSuccessful();

        self::assertTrue(Schema::hasTable('cvc_vaults'));
        self::assertTrue(Schema::hasTable('cvc_contexts'));
    }
}
