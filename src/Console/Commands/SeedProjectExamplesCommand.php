<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Console\Commands;

use CrowVaultCanvas\Application\Demo\SeedProjectExamples;
use Illuminate\Console\Command;

final class SeedProjectExamplesCommand extends Command
{
    protected $signature = 'cvc:seed-projects';

    protected $description = 'Create the Meus Projetos example universe in the local vault';

    public function handle(SeedProjectExamples $seed): int
    {
        if (! $this->laravel->environment('local', 'testing')) {
            $this->components->error('A carga de exemplos só está disponível em ambiente local ou de teste.');

            return self::FAILURE;
        }

        $result = $seed->handle();
        $this->components->info(sprintf(
            'Notas criadas: %d. Ligações criadas: %d. Itens preservados ou ignorados: %d.',
            $result['notes'], $result['links'], $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
