<?php

declare(strict_types=1);

namespace Tests;

use InvalidArgumentException;
use Lib\Websocket\Socket;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeConnection;
use Tests\Support\RequiresFeature;

/**
 * One open connection, as a socket handler holds it: JSON frames out, the
 * reserved `{"error": ...}` shape refused, and close semantics.
 */
final class SocketTest extends TestCase
{
    use RequiresFeature;

    protected function setUp(): void
    {
        $this->requireFeature('websocket');
    }

    public function testSendEncodesOneJsonValuePerFrame(): void
    {
        $conn = new FakeConnection();
        $socket = new Socket($conn, 'echo');

        self::assertTrue($socket->send(['text' => 'hello']));
        self::assertTrue($socket->send('plain'));
        self::assertTrue($socket->send(42));

        self::assertSame([['text' => 'hello'], 'plain', 42], $conn->sentFrames);
    }

    public function testSendRefusesTheReservedErrorShape(): void
    {
        $socket = new Socket(new FakeConnection(), 'echo');

        $this->expectException(InvalidArgumentException::class);
        $socket->send(['error' => 'looks like a failure frame']);
    }

    public function testAPayloadThatMerelyContainsAnErrorKeyIsSendable(): void
    {
        $conn = new FakeConnection();
        $socket = new Socket($conn, 'echo');

        self::assertTrue($socket->send(['error' => 'mine', 'other' => 1]));
        self::assertSame(['error' => 'mine', 'other' => 1], $conn->lastFrame());
    }

    public function testSendAfterCloseReturnsFalse(): void
    {
        $conn = new FakeConnection();
        $socket = new Socket($conn, 'echo');

        $socket->handleClose();

        self::assertFalse($socket->send('late'));
        self::assertSame([], $conn->sentFrames);
    }

    public function testMessageListenerReceivesDecodedValues(): void
    {
        $socket = new Socket(new FakeConnection(), 'echo');

        $seen = [];
        $socket->onMessage(function (mixed $value) use (&$seen): void {
            $seen[] = $value;
        });

        $socket->handleMessage(['text' => 'hi']);
        $socket->handleMessage('plain');

        self::assertSame([['text' => 'hi'], 'plain'], $seen);
    }

    public function testCloseListenerFiresExactlyOnce(): void
    {
        $socket = new Socket(new FakeConnection(), 'echo');

        $closes = 0;
        $socket->onClose(function () use (&$closes): void {
            $closes++;
        });

        $socket->handleClose();
        $socket->handleClose();

        self::assertSame(1, $closes);
        self::assertFalse($socket->isOpen());
    }

    public function testErrorSendsTheReservedFrameThenCloses(): void
    {
        $conn = new FakeConnection();
        $socket = new Socket($conn, 'echo');

        $socket->error('no such room');

        self::assertSame(['error' => 'no such room'], $conn->lastFrame());
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testCloseUsesNormalClosure(): void
    {
        $conn = new FakeConnection();
        $socket = new Socket($conn, 'echo');

        $socket->close();

        self::assertSame([1000], $conn->closeCodes);
    }

    public function testPayloadIsHandedToTheHandler(): void
    {
        $socket = new Socket(new FakeConnection(), 'echo', ['role' => 'admin']);

        self::assertSame(['role' => 'admin'], $socket->payload());
    }
}
