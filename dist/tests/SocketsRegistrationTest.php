<?php

declare(strict_types=1);

namespace Tests;

use Lib\Websocket\SocketRegistry;
use PHPUnit\Framework\TestCase;
use Tests\Support\RequiresFeature;

/**
 * The app's real registration file loads cleanly and registers every socket
 * the frontend connects to. A socket the browser names but the server never
 * registered is a refused connection in production — catch it here instead.
 */
final class SocketsRegistrationTest extends TestCase
{
    use RequiresFeature;

    protected function setUp(): void
    {
        $this->requireFeature('websocket');
        SocketRegistryTest::resetRegistry();
    }

    protected function tearDown(): void
    {
        SocketRegistryTest::resetRegistry();
    }

    public function testTheRegistrationFileLoadsAndNamesItsSockets(): void
    {
        require DOCUMENT_PATH . '/src/Lib/Websocket/sockets.php';

        $names = SocketRegistry::names();

        self::assertContains('echo', $names);
        self::assertContains('chat', $names);
    }
}
