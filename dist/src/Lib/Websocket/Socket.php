<?php

declare(strict_types=1);

namespace Lib\Websocket;

use Ratchet\ConnectionInterface;
use InvalidArgumentException;

/**
 * One open connection, as a socket handler holds it.
 *
 * The server half of `pp.socket(name, args, handlers)`. A handler receives
 * this and the argument payload once the first frame arrives, wires its
 * callbacks, and talks JSON frames both ways:
 *
 * ```php
 * SocketRegistry::register('echo', function (Socket $socket, array $args): void {
 *     $socket->onMessage(fn (mixed $value) => $socket->send($value));
 * });
 * ```
 *
 * The frame shape `{"error": "..."}` (that key alone) is reserved by the
 * wire: it is how the server reports a failure inside an open connection,
 * and the client runtime routes it to `onError` followed by the close.
 * `send()` therefore refuses to emit it as an ordinary message.
 */
final class Socket
{
    private bool $closed = false;

    /** @var callable|null fn(mixed $value): void */
    private $messageListener = null;

    /** @var callable|null fn(): void */
    private $closeListener = null;

    public function __construct(
        private readonly ConnectionInterface $conn,
        private readonly string $name,
        private readonly mixed $authPayload = null,
    ) {}

    public function name(): string
    {
        return $this->name;
    }

    /**
     * The verified auth payload of the connection, or null for a guest.
     */
    public function payload(): mixed
    {
        return $this->authPayload;
    }

    public function isOpen(): bool
    {
        return !$this->closed;
    }

    /**
     * Send one JSON value. False means nobody is listening any more — the
     * browser navigated away or closed the tab. That is the signal to stop,
     * not an error to report.
     */
    public function send(mixed $value): bool
    {
        if ($this->closed) {
            return false;
        }

        if (self::isReservedErrorShape($value)) {
            throw new InvalidArgumentException(
                'The frame shape {"error": "..."} is reserved for failures. '
                    . 'Wrap the value or rename the key.'
            );
        }

        $frame = json_encode($value, JSON_UNESCAPED_UNICODE);
        if ($frame === false) {
            return false;
        }

        $this->conn->send($frame);

        return !$this->closed;
    }

    /**
     * Called with each decoded JSON value the browser sends.
     */
    public function onMessage(callable $listener): void
    {
        $this->messageListener = $listener;
    }

    /**
     * Called once, when the connection closes for any reason.
     */
    public function onClose(callable $listener): void
    {
        $this->closeListener = $listener;
    }

    /**
     * Say goodbye mid-conversation. Close code 1000, a normal closure.
     */
    public function close(): void
    {
        if ($this->closed) {
            return;
        }

        $this->conn->close(1000);
    }

    /**
     * The error frame, then the close. The conversation is over.
     * Framework/handler use for failures meant to reach `onError`.
     */
    public function error(string $message): void
    {
        if ($this->closed) {
            return;
        }

        $this->conn->send(json_encode(['error' => $message], JSON_UNESCAPED_UNICODE));
        $this->conn->close(1008);
    }

    /** @internal Called by the connection manager on each inbound frame. */
    public function handleMessage(mixed $value): void
    {
        if ($this->messageListener !== null) {
            ($this->messageListener)($value);
        }
    }

    /** @internal Called by the connection manager when the wire closes. */
    public function handleClose(): void
    {
        if ($this->closed) {
            return;
        }

        $this->closed = true;

        if ($this->closeListener !== null) {
            ($this->closeListener)();
        }
    }

    /** @internal Close with a specific code without emitting a frame. */
    public function closeWithCode(int $code): void
    {
        if ($this->closed) {
            return;
        }

        $this->conn->close($code);
    }

    public static function isReservedErrorShape(mixed $value): bool
    {
        return is_array($value)
            && array_keys($value) === ['error']
            && is_string($value['error']);
    }
}
