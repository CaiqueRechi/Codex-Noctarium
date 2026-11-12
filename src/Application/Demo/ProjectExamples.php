<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Demo;

use CrowVaultCanvas\Domain\Knowledge\Content\Flowchart;

final class ProjectExamples
{
    /** @return array<string, array{title: string, parent: ?string, content: string}> */
    public function notes(): array
    {
        return [
            'projects' => ['title' => 'Meus Projetos', 'parent' => null, 'content' => 'Universo de demonstração. As notas descrevem projetos identificados no levantamento do Canvas Cósmico.'],
            'crow' => ['title' => 'Ecossistema Crow', 'parent' => 'projects', 'content' => 'Documentação e tecnologias do vault.'],
            'noctarium' => ['title' => 'Codex Noctarium (Crow Vault Canvas)', 'parent' => 'crow', 'content' => 'Pacote Laravel com interface React e TypeScript, integrado ao Rechi OS. Fonte: README e manifests do pacote e do host.'],
            'canvas-math' => ['title' => 'Como os pesos de conteúdo e subnotas distribuem a área do canvas', 'parent' => 'noctarium', 'content' => 'Q = 0,5C + 0,8H. A área disponível é dividida proporcionalmente depois de reservar o espaço vazio. Fonte: canvas-cosmico-formulas.md.'],
            'vault-model' => ['title' => 'Identidade das notas e navegação', 'parent' => 'noctarium', 'content' => 'Uma nota mantém a identidade ao aparecer em mais de um espaço. As relações externas permitem encontrar notas de outros espaços pelo ancestral comum. Fonte: documentação de requisitos do Canvas Cósmico.'],
            'vault-stack' => ['title' => 'Laravel, React e TypeScript no Vault', 'parent' => 'noctarium', 'content' => 'O pacote usa Laravel no backend e entrega componentes React escritos em TypeScript para o host. Fonte: composer.json e fontes de resources/js.'],
            'save-flow' => ['title' => 'Fluxograma de salvamento da nota', 'parent' => 'noctarium', 'content' => $this->saveFlow()],
            'personal-apps' => ['title' => 'Aplicações pessoais', 'parent' => 'projects', 'content' => 'Projetos de uso pessoal.'],
            'rechi-os' => ['title' => 'Rechi OS', 'parent' => 'personal-apps', 'content' => 'Aplicação Laravel que hospeda o pacote do Vault. Fonte: manifesto Composer do Rechi OS.'],
            'integration' => ['title' => 'Integração do Vault com a aplicação hospedeira', 'parent' => 'rechi-os', 'content' => 'O host fornece sessão, permissões e compilação do frontend. Fonte: README do pacote e manifests do host.'],
            'host-stack' => ['title' => 'Laravel, React e TypeScript no Rechi OS', 'parent' => 'rechi-os', 'content' => 'O host declara Laravel no manifesto Composer e React e TypeScript no manifesto npm. Fonte: composer.json e package.json do Rechi OS.'],
            'ai' => ['title' => 'Inteligência artificial', 'parent' => 'projects', 'content' => 'Categoria de exemplo do levantamento.'],
            'eris' => ['title' => 'E.R.I.S.', 'parent' => 'ai', 'content' => 'Projeto identificado no levantamento. Documentação técnica pendente.'],
            'memories' => ['title' => 'Projetos afetivos', 'parent' => 'projects', 'content' => 'Categoria de exemplo do levantamento.'],
            'salem' => ['title' => 'Memorial Salem', 'parent' => 'memories', 'content' => 'Projeto memorial identificado no levantamento. Documentação técnica pendente.'],
        ];
    }

    private function saveFlow(): string
    {
        return json_encode([
            'format' => Flowchart::FORMAT,
            'version' => 1,
            'description' => 'Fluxo ilustrativo baseado no RF-06 e na decisão D-08.',
            'nodes' => [
                ['id' => 'edit', 'kind' => 'start', 'text' => 'Editar nota', 'x' => 0, 'y' => 0],
                ['id' => 'pause', 'kind' => 'process', 'text' => 'Aguardar 1,5 s sem edição', 'x' => 0, 'y' => 150],
                ['id' => 'save', 'kind' => 'process', 'text' => 'Enviar salvamento', 'x' => 0, 'y' => 300],
                ['id' => 'confirmed', 'kind' => 'decision', 'text' => 'Servidor confirmou?', 'x' => 0, 'y' => 450],
                ['id' => 'retry', 'kind' => 'decision', 'text' => 'Falha transitória e menos de 3 tentativas?', 'x' => 350, 'y' => 450],
                ['id' => 'wait', 'kind' => 'process', 'text' => 'Aguardar 1,5 s antes de reenviar', 'x' => 350, 'y' => 300],
                ['id' => 'saved', 'kind' => 'start', 'text' => 'Salvo', 'x' => 0, 'y' => 600],
                ['id' => 'failed', 'kind' => 'start', 'text' => 'Exibir erro e manter rascunho na aba', 'x' => 350, 'y' => 600],
            ],
            'edges' => [
                ['id' => 'edit-pause', 'from' => 'edit', 'to' => 'pause', 'text' => ''],
                ['id' => 'pause-save', 'from' => 'pause', 'to' => 'save', 'text' => ''],
                ['id' => 'save-check', 'from' => 'save', 'to' => 'confirmed', 'text' => ''],
                ['id' => 'check-saved', 'from' => 'confirmed', 'to' => 'saved', 'text' => 'Sim'],
                ['id' => 'check-retry', 'from' => 'confirmed', 'to' => 'retry', 'text' => 'Não'],
                ['id' => 'retry-wait', 'from' => 'retry', 'to' => 'wait', 'text' => 'Sim'],
                ['id' => 'wait-save', 'from' => 'wait', 'to' => 'save', 'text' => ''],
                ['id' => 'retry-failed', 'from' => 'retry', 'to' => 'failed', 'text' => 'Não'],
            ],
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
