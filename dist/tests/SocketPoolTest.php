<?php

declare(strict_types=1);

namespace Tests;

use Lib\Websocket\Socket;
use Lib\Websocket\SocketPool;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeConnection;
use Tests\Support\RequiresFeature;

/**
 * A broadcast pool: one value to everyone, with gone connections pruned on
 * the way.
 */
final class SocketPoolTest extends TestCase
{
    use RequiresFeature;

    protected function setUp(): void
    {
        $this->requireFeature('websocket');
    }

    public function testBroadcastReachesEveryOpenSocket(): void
    {
        $pool = new SocketPool();
        $connA = new FakeConnection();
        $connB = new FakeConnection();

        $pool->add(new Socket($connA, 'chat'));
        $pool->add(new Socket($connB, 'chat'));

        $pool->broadcast(['text' => 'hello room']);

        self::assertSame([['text' => 'hello room']], $connA->sentFrames);
        self::assertSame([['text' => 'hello room']], $connB->sentFrames);
    }

    public function testClosedSocketsArePrunedByBroadcast(): void
    {
        $pool = new SocketPool();
        $connA = new FakeConnection();
        $gone = new Socket(new FakeConnection(), 'chat');

        $pool->add(new Socket($connA, 'chat'));
        $pool->add($gone);
        $gone->handleClose();

        $pool->broadcast('first');

        self::assertSame(1, $pool->count(), 'the closed connection was forgotten');
        self::assertSame(['first'], $connA->sentFrames);
    }

    public function testDiscardRemovesOnlyThatSocket(): void
    {
        $pool = new SocketPool();
        $keep = new Socket(new FakeConnection(), 'chat');
        $drop = new Socket(new FakeConnection(), 'chat');

        $pool->add($keep);
        $pool->add($drop);
        $pool->discard($drop);

        self::assertSame(1, $pool->count());
    }
}
