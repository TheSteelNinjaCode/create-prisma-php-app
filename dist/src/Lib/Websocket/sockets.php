<?php

declare(strict_types=1);

/**
 * Named-socket registrations: the server half of `pp.socket(...)`.
 *
 * This file is loaded once by `websocket-server.php` on startup. Register
 * each socket the app serves here; the name the client connects with is the
 * registered one, and names are unique application-wide.
 *
 * From the browser:
 *
 * ```js
 * const sock = pp.socket("echo", { label: "you" }, {
 *     onMessage: (value) => append(value),
 * });
 * sock.send("hello");
 * ```
 */

use Lib\Websocket\Socket;
use Lib\Websocket\SocketPool;
use Lib\Websocket\SocketRegistry;

// A minimal example: echo every frame back, prefixed with the label the
// page opened the socket with.
SocketRegistry::register('echo', function (Socket $socket, array $args): void {
    $label = is_string($args['label'] ?? null) ? $args['label'] : 'echo';

    $socket->onMessage(function (mixed $value) use ($socket, $label): void {
        $text = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
        $socket->send("$label: $text");
    });
});

// A broadcast example: everyone connected to `chat` hears everyone else.
$chatRoom = new SocketPool();

SocketRegistry::register('chat', function (Socket $socket, array $args) use ($chatRoom): void {
    $chatRoom->add($socket);

    $socket->onMessage(function (mixed $value) use ($chatRoom): void {
        $chatRoom->broadcast($value);
    });

    $socket->onClose(function () use ($chatRoom, $socket): void {
        $chatRoom->discard($socket);
    });
});
