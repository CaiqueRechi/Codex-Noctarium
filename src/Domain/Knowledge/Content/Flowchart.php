<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Domain\Knowledge\Content;

/**
 * RF-04 and D-07: a flowchart note keeps its diagram as JSON in its own
 * document, saved and versioned like any note. The content names its own
 * format, so a version restored from any time brings back the right kind
 * of note.
 *
 * {"format": "cvc-flowchart", "version": 1, "description": "…",
 *  "nodes": [{"id", "kind", "text", "x", "y"}], "edges": [{"id", "from", "to", "text"}]}
 */
final readonly class Flowchart
{
    public const FORMAT = 'cvc-flowchart';

    public const KINDS = ['start', 'process', 'decision', 'io'];

    private const MAXIMUM_NODES = 500;

    private const MAXIMUM_EDGES = 1000;

    private const MAXIMUM_TEXT = 500;

    /**
     * @param  list<array{id: string, kind: string, text: string, x: float, y: float}>  $nodes
     * @param  list<array{id: string, from: string, to: string, text: string}>  $edges
     */
    private function __construct(
        public string $description,
        public array $nodes,
        public array $edges,
    ) {}

    public static function isFlowchart(string $content): bool
    {
        if (! str_starts_with(ltrim($content), '{')) {
            return false;
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) && ($decoded['format'] ?? null) === self::FORMAT;
    }

    /** @throws InvalidFlowchart */
    public static function fromJson(string $content): self
    {
        $data = json_decode($content, true);

        if (! is_array($data) || ($data['format'] ?? null) !== self::FORMAT || ($data['version'] ?? null) !== 1) {
            throw new InvalidFlowchart('O fluxograma não está num formato conhecido.');
        }

        $description = $data['description'] ?? '';
        $nodes = $data['nodes'] ?? null;
        $edges = $data['edges'] ?? null;

        if (! is_string($description) || ! is_array($nodes) || ! is_array($edges) || ! array_is_list($nodes) || ! array_is_list($edges)) {
            throw new InvalidFlowchart('O fluxograma precisa de descrição, nós e ligações.');
        }

        if (count($nodes) > self::MAXIMUM_NODES || count($edges) > self::MAXIMUM_EDGES) {
            throw new InvalidFlowchart('O fluxograma passa do limite de 500 blocos ou 1000 ligações.');
        }

        $validNodes = array_map(self::node(...), $nodes);
        $ids = array_column($validNodes, 'id');

        if (count($ids) !== count(array_unique($ids))) {
            throw new InvalidFlowchart('Dois blocos do fluxograma têm o mesmo identificador.');
        }

        $validEdges = array_map(fn (mixed $edge): array => self::edge($edge, $ids), $edges);

        return new self($description, $validNodes, $validEdges);
    }

    /** @return array{id: string, kind: string, text: string, x: float, y: float} */
    private static function node(mixed $node): array
    {
        if (
            ! is_array($node)
            || ! self::isIdentifier($node['id'] ?? null)
            || ! in_array($node['kind'] ?? null, self::KINDS, true)
            || ! self::isText($node['text'] ?? null)
            || ! self::isCoordinate($node['x'] ?? null)
            || ! self::isCoordinate($node['y'] ?? null)
        ) {
            throw new InvalidFlowchart('Um bloco do fluxograma está incompleto ou inválido.');
        }

        return [
            'id' => $node['id'],
            'kind' => $node['kind'],
            'text' => $node['text'],
            'x' => (float) $node['x'],
            'y' => (float) $node['y'],
        ];
    }

    /**
     * @param  list<string>  $nodeIds
     * @return array{id: string, from: string, to: string, text: string}
     */
    private static function edge(mixed $edge, array $nodeIds): array
    {
        if (
            ! is_array($edge)
            || ! self::isIdentifier($edge['id'] ?? null)
            || ! in_array($edge['from'] ?? null, $nodeIds, true)
            || ! in_array($edge['to'] ?? null, $nodeIds, true)
            || ! self::isText($edge['text'] ?? null)
        ) {
            throw new InvalidFlowchart('Uma seta do fluxograma liga blocos que não existem.');
        }

        return ['id' => $edge['id'], 'from' => $edge['from'], 'to' => $edge['to'], 'text' => $edge['text']];
    }

    private static function isIdentifier(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $value) === 1;
    }

    private static function isText(mixed $value): bool
    {
        return is_string($value) && mb_strlen($value) <= self::MAXIMUM_TEXT;
    }

    private static function isCoordinate(mixed $value): bool
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value) && abs((float) $value) <= 1_000_000;
    }
}
