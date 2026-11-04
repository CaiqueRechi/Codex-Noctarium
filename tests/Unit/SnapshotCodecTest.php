<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use CrowVaultCanvas\Application\Versions\SnapshotCodec;
use PHPUnit\Framework\TestCase;

final class SnapshotCodecTest extends TestCase
{
    public function test_object_key_order_does_not_change_the_snapshot_hash(): void
    {
        $codec = new SnapshotCodec;

        self::assertSame(
            $codec->hash([
                'perspective' => [
                    'name' => 'Principal',
                    'filters' => ['types' => [], 'contexts' => ['a', 'b']],
                ],
                'entities' => [['id' => '1', 'title' => 'Nota']],
            ]),
            $codec->hash([
                'entities' => [['title' => 'Nota', 'id' => '1']],
                'perspective' => [
                    'filters' => ['contexts' => ['a', 'b'], 'types' => []],
                    'name' => 'Principal',
                ],
            ]),
        );
    }

    public function test_list_order_remains_part_of_the_snapshot_hash(): void
    {
        $codec = new SnapshotCodec;

        self::assertNotSame(
            $codec->hash(['entities' => [['id' => '1'], ['id' => '2']]]),
            $codec->hash(['entities' => [['id' => '2'], ['id' => '1']]]),
        );
    }
}
