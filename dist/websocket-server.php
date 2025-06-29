<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Websocket\ConnectionManager;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new ConnectionManager()
        )
    ),
    8080
);

echo "WebSocket server started on port 8080...\n";
$server->run();
