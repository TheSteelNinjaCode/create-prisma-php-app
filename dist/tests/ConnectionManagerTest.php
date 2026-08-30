<?php

declare(strict_types=1);

namespace Tests;

use Lib\Auth\Auth;
use Lib\Websocket\ConnectionManager;
use Lib\Websocket\Socket;
use Lib\Websocket\SocketRegistry;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeConnection;
use Tests\Support\RequiresFeature;

/**
 * The named-socket wire from the server's side: where a connection must go,
 * what the first frame is, and which failures travel as the reserved
 * `{"error": ...}` frame.
 *
 * Mirrors the client runtime's SocketClient tests: name in the `name` query
 * parameter, arguments as the first JSON object frame, refusals as an error
 * frame followed by a close.
 */
final class ConnectionManagerTest extends TestCase
{
    use RequiresFeature;

    /** @var array<string, string|false> */
    private array $envBackup = [];

    protected function setUp(): void
    {
        $this->requireFeature('websocket');
        SocketRegistryTest::resetRegistry();
    }

    protected function tearDown(): void
    {
        SocketRegistryTest::resetRegistry();

        foreach ($this->envBackup as $name => $previous) {
            if ($previous === false) {
                putenv($name);
            } else {
                putenv("$name=$previous");
            }
        }
        $this->envBackup = [];
    }

    private function setEnv(string $name, string $value): void
    {
        if (!array_key_exists($name, $this->envBackup)) {
            $this->envBackup[$name] = getenv($name);
        }
        putenv("$name=$value");
    }

    /** A connection from a dev-browser origin, upgraded and args sent. */
    private function openWithArgs(
        ConnectionManager $manager,
        FakeConnection $conn,
        array $args = [],
    ): void {
        $manager->onOpen($conn);
        $manager->onMessage($conn, json_encode($args === [] ? new \stdClass() : $args));
    }

    private function devConnection(string $name): FakeConnection
    {
        return new FakeConnection(
            "/__pulsepoint/ws?name=$name",
            ['Origin' => 'http://localhost:3000'],
        );
    }

    public function testUnknownNameIsRefusedWithAReadableErrorFrame(): void
    {
        $manager = new ConnectionManager();
        $conn = $this->devConnection('nope');

        $manager->onOpen($conn);

        $frame = $conn->lastFrame();
        self::assertIsArray($frame);
        self::assertArrayHasKey('error', $frame);
        self::assertStringContainsString('No socket named `nope`', $frame['error']);
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testMissingNameIsRefused(): void
    {
        $manager = new ConnectionManager();
        $conn = new FakeConnection('/__pulsepoint/ws', ['Origin' => 'http://localhost:3000']);

        $manager->onOpen($conn);

        self::assertStringContainsString('named no socket', $conn->lastFrame()['error']);
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testArgumentsArriveAsTheFirstFrameAndReachTheHandler(): void
    {
        $received = null;
        SocketRegistry::register('echo', function (Socket $socket, array $args) use (&$received): void {
            $received = $args;
            $socket->onMessage(fn (mixed $value) => $socket->send("you: $value"));
        });

        $manager = new ConnectionManager();
        $conn = $this->devConnection('echo');

        $this->openWithArgs($manager, $conn, ['room' => 'lobby']);
        self::assertSame(['room' => 'lobby'], $received);

        $manager->onMessage($conn, '"hello"');
        self::assertSame('you: hello', $conn->lastFrame());
        self::assertSame([], $conn->closeCodes, 'the conversation stays open');
    }

    public function testEmptyArgumentsObjectIsAccepted(): void
    {
        $received = null;
        SocketRegistry::register('feed', function (Socket $socket, array $args) use (&$received): void {
            $received = $args;
        });

        $manager = new ConnectionManager();
        $conn = $this->devConnection('feed');

        $this->openWithArgs($manager, $conn);

        self::assertSame([], $received);
        self::assertSame([], $conn->closeCodes);
    }

    public function testANonObjectFirstFrameIsRefused(): void
    {
        SocketRegistry::register('echo', static function (): void {});

        $manager = new ConnectionManager();
        $conn = $this->devConnection('echo');

        $manager->onOpen($conn);
        $manager->onMessage($conn, '[1, 2]');

        self::assertStringContainsString('not a JSON object', $conn->lastFrame()['error']);
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testAnUnreadableFrameTravelsBackAsAnErrorFrame(): void
    {
        SocketRegistry::register('echo', function (Socket $socket): void {
            $socket->onMessage(static function (): void {});
        });

        $manager = new ConnectionManager();
        $conn = $this->devConnection('echo');

        $this->openWithArgs($manager, $conn);
        $manager->onMessage($conn, '{not json');

        self::assertStringContainsString('could not read a frame', $conn->lastFrame()['error']);
    }

    public function testAnOversizedFrameClosesWith1009(): void
    {
        SocketRegistry::register('echo', static function (): void {});

        $manager = new ConnectionManager();
        $conn = $this->devConnection('echo');

        $this->openWithArgs($manager, $conn);
        $manager->onMessage($conn, json_encode(str_repeat('x', 5000)));

        self::assertContains(1009, $conn->closeCodes);
    }

    public function testProductionRefusesAnUnknownOriginBeforeAnyFrame(): void
    {
        SocketRegistry::register('echo', static function (): void {});
        $this->setEnv('APP_ENV', 'production');

        $manager = new ConnectionManager();
        $conn = new FakeConnection(
            '/__pulsepoint/ws?name=echo',
            ['Origin' => 'https://evil.example'],
        );

        $manager->onOpen($conn);

        self::assertSame([], $conn->sentFrames, 'refused silently, before the wire speaks');
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testProductionAcceptsAnOriginNamedInTheAllowlist(): void
    {
        SocketRegistry::register('echo', static function (): void {});
        $this->setEnv('APP_ENV', 'production');
        $this->setEnv('WEBSOCKET_ALLOWED_ORIGINS', 'https://app.example');

        $manager = new ConnectionManager();
        $conn = new FakeConnection(
            '/__pulsepoint/ws?name=echo',
            ['Origin' => 'https://app.example'],
        );

        $manager->onOpen($conn);

        self::assertSame([], $conn->closeCodes);
    }

    public function testRequireAuthRefusesAGuestConnection(): void
    {
        SocketRegistry::register('private', static function (): void {}, requireAuth: true);

        $manager = new ConnectionManager();
        $conn = $this->devConnection('private');

        $manager->onOpen($conn);

        self::assertStringContainsString('signed-in session', $conn->lastFrame()['error']);
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testAValidAuthCookieReachesTheHandlerAsThePayload(): void
    {
        $seenPayload = false;
        SocketRegistry::register('private', function (Socket $socket) use (&$seenPayload): void {
            $seenPayload = $socket->payload();
        }, requireAuth: true);

        $jwt = Auth::getInstance()->signIn('admin');

        $manager = new ConnectionManager();
        $conn = new FakeConnection('/__pulsepoint/ws?name=private', [
            'Origin' => 'http://localhost:3000',
            'Cookie' => Auth::$cookieName . '=' . $jwt,
        ]);

        $this->openWithArgs($manager, $conn);

        self::assertSame('admin', $seenPayload);
        self::assertSame([], $conn->closeCodes);
    }

    public function testAHandlerExceptionTravelsAsTheErrorFrame(): void
    {
        SocketRegistry::register('broken', static function (): void {
            throw new \RuntimeException('boom');
        });

        $manager = new ConnectionManager();
        $conn = $this->devConnection('broken');

        $this->openWithArgs($manager, $conn);

        $frame = $conn->lastFrame();
        self::assertArrayHasKey('error', $frame);
        self::assertStringContainsString('boom', $frame['error'], 'development shows the message');
        self::assertSame([1008], $conn->closeCodes);
    }

    public function testCloseReleasesTheConnectionSlot(): void
    {
        SocketRegistry::register('echo', static function (): void {});

        $manager = new ConnectionManager();
        $conn = $this->devConnection('echo');

        $this->openWithArgs($manager, $conn);
        self::assertSame(1, $manager->openConnectionCount());

        $manager->onClose($conn);
        self::assertSame(0, $manager->openConnectionCount());
    }
}
