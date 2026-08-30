<?php

declare(strict_types=1);

namespace Lib\Websocket;

/**
 * A broadcast pool: one `Socket` per open connection.
 *
 * How a handler shares its connection with the room it belongs to: keep one
 * pool in shared state, `add` each socket when its conversation starts, and
 * `broadcast` fans one value out to everyone. Connections whose browser is
 * gone are pruned on the way. Keep authenticated and guest traffic in
 * separate pools so a private broadcast can never reach a guest connection.
 */
final class SocketPool
{
    /** @var Socket[] */
    private array $sockets = [];

    public function count(): int
    {
        return count($this->sockets);
    }

    public function add(Socket $socket): void
    {
        $this->sockets[] = $socket;
    }

    public function discard(Socket $socket): void
    {
        $this->sockets = array_values(array_filter(
            $this->sockets,
            static fn (Socket $candidate): bool => $candidate !== $socket,
        ));
    }

    /**
     * Send one value to everyone, pruning closed connections.
     */
    public function broadcast(mixed $value): void
    {
        foreach ($this->sockets as $socket) {
            if (!$socket->send($value)) {
                $this->discard($socket);
            }
        }
    }
}
