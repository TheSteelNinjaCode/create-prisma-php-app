<?php

declare(strict_types=1);

require __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../settings/paths.php';

use Dotenv\Dotenv;

Dotenv::createImmutable(DOCUMENT_PATH)->load();

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Lib\Websocket\ConnectionManager;

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
