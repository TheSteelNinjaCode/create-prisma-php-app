<?php

declare(strict_types=1);

namespace Lib\Websocket;

use InvalidArgumentException;

/**
 * The named-socket registry: what `pp.socket("name", ...)` connects to.
 *
 * The client connects with a name and nothing else, so socket names are
 * unique application-wide and a duplicate is refused at registration time.
 * Registrations live in `src/Lib/Websocket/sockets.php`, which the socket
 * server loads on startup.
 */
final class SocketRegistry
{
    /**
     * @var array<string, array{
     *     name: string,
     *     handler: callable,
     *     requireAuth: bool,
     *     allowedRoles: string[],
     * }>
     */
    private static array $sockets = [];

    /**
     * Register a function as a named socket.
     *
     * The handler receives `(Socket $socket, array $args)`: the open
     * connection and the argument payload from the connection's first frame.
     *
     * - `requireAuth: true` refuses the connection unless the handshake
     *   carries a valid auth cookie, before the handler runs.
     * - `allowedRoles: [...]` adds RBAC on the verified payload, the same
     *   rule as `#[Exposed(allowedRoles: [...])]`.
     *
     * @param string[] $allowedRoles
     */
    public static function register(
        string $name,
        callable $handler,
        bool $requireAuth = false,
        array $allowedRoles = [],
    ): void {
        if ($name === '') {
            throw new InvalidArgumentException('A socket needs a non-empty name.');
        }

        if (isset(self::$sockets[$name])) {
            throw new InvalidArgumentException(
                "Two sockets are named `$name`. The client connects with a "
                    . 'name and nothing else, so socket names must be unique '
                    . 'application-wide.'
            );
        }

        self::$sockets[$name] = [
            'name' => $name,
            'handler' => $handler,
            'requireAuth' => $requireAuth,
            'allowedRoles' => array_values($allowedRoles),
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     handler: callable,
     *     requireAuth: bool,
     *     allowedRoles: string[],
     * }|null
     */
    public static function get(string $name): ?array
    {
        return self::$sockets[$name] ?? null;
    }

    /**
     * @return string[]
     */
    public static function names(): array
    {
        return array_keys(self::$sockets);
    }
}
