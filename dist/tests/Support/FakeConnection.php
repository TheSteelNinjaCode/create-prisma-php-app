<?php

declare(strict_types=1);

namespace Tests\Support;

use Ratchet\ConnectionInterface;
use GuzzleHttp\Psr7\Request as Psr7Request;

/**
 * A Ratchet connection stand-in that records what the server sends.
 *
 * The named-socket wire is frames and closes, so a test only needs to see
 * both: `$sentFrames` collects every `send(...)` payload (decoded from JSON
 * when possible) and `$closeCodes` collects every `close(...)` code. The
 * `httpRequest` property mirrors how Ratchet exposes the handshake request.
 */
final class FakeConnection implements ConnectionInterface
{
    /** @var list<mixed> Decoded JSON frames (raw string when not JSON). */
    public array $sentFrames = [];

    /** @var list<string> Raw frames exactly as sent. */
    public array $rawFrames = [];

    /** @var list<int> */
    public array $closeCodes = [];

    public bool $isClosed = false;

    public ?Psr7Request $httpRequest = null;

    /**
     * @param array<string, string> $headers Handshake headers (e.g. Origin, Cookie).
     */
    public function __construct(string $uri = '/__pulsepoint/ws', array $headers = [])
    {
        $this->httpRequest = new Psr7Request('GET', $uri, $headers);
    }

    public function send($data): ConnectionInterface
    {
        $this->rawFrames[] = (string) $data;

        $decoded = json_decode((string) $data, true);
        $this->sentFrames[] = json_last_error() === JSON_ERROR_NONE ? $decoded : (string) $data;

        return $this;
    }

    public function close($code = 1000): void
    {
        $this->closeCodes[] = (int) $code;
        $this->isClosed = true;
    }

    /** The last frame the server sent, decoded. */
    public function lastFrame(): mixed
    {
        return $this->sentFrames === [] ? null : end($this->sentFrames);
    }
}
