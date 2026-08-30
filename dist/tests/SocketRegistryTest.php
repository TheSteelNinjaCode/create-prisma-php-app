<?php

declare(strict_types=1);

namespace Tests;

use InvalidArgumentException;
use Lib\Websocket\SocketRegistry;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use Tests\Support\RequiresFeature;

/**
 * The named-socket registry: names are the whole address, so they are unique
 * application-wide and a duplicate is refused at registration time.
 */
final class SocketRegistryTest extends TestCase
{
    use RequiresFeature;

    protected function setUp(): void
    {
        $this->requireFeature('websocket');
        self::resetRegistry();
    }

    protected function tearDown(): void
    {
        self::resetRegistry();
    }

    public static function resetRegistry(): void
    {
        // tearDown() still runs after a feature skip, and in an app without
        // the websocket scaffold the class does not exist — nothing to reset.
        if (!class_exists(SocketRegistry::class)) {
            return;
        }

        $reflection = new ReflectionClass(SocketRegistry::class);
        $reflection->getProperty('sockets')->setValue(null, []);
    }

    public function testRegisterAndResolveByName(): void
    {
        $handler = static function (): void {};

        SocketRegistry::register('chat', $handler, requireAuth: true, allowedRoles: ['admin']);

        $entry = SocketRegistry::get('chat');
        self::assertNotNull($entry);
        self::assertSame('chat', $entry['name']);
        self::assertSame($handler, $entry['handler']);
        self::assertTrue($entry['requireAuth']);
        self::assertSame(['admin'], $entry['allowedRoles']);
        self::assertSame(['chat'], SocketRegistry::names());
    }

    public function testUnknownNameResolvesToNull(): void
    {
        self::assertNull(SocketRegistry::get('nope'));
    }

    public function testDuplicateNameIsRefused(): void
    {
        SocketRegistry::register('chat', static function (): void {});

        $this->expectException(InvalidArgumentException::class);
        SocketRegistry::register('chat', static function (): void {});
    }

    public function testEmptyNameIsRefused(): void
    {
        $this->expectException(InvalidArgumentException::class);
        SocketRegistry::register('', static function (): void {});
    }
}
