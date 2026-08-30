<?php

declare(strict_types=1);

namespace Lib\Websocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\LoopInterface;
use React\EventLoop\TimerInterface;
use Lib\Auth\Auth;
use PP\Env;
use Exception;
use SplObjectStorage;
use Throwable;

/**
 * The server half of `pp.socket(...)`: the PulsePoint named-socket wire.
 *
 * Every socket connects to one endpoint (`/__pulsepoint/ws` through the dev
 * proxy, this Ratchet server directly otherwise), naming its function in the
 * `name` query parameter. The arguments do not travel in the URL — a URL is
 * logged by every proxy on the way — but as the first text frame, one JSON
 * object, exactly the payload `pp.rpc` would have posted. Every frame after
 * that is one JSON value, in either direction.
 *
 * There is no status line inside an open connection, so failure is a frame:
 * `{"error": "..."}` — that key alone — followed by a close. The client
 * runtime routes it to `onError` rather than `onMessage`.
 *
 * Handshake security mirrors the reference server: an anti-CSWSH origin
 * check and a connection ceiling before anything else, then per-socket auth
 * (`requireAuth` / `allowedRoles` on the registry entry, verified against
 * the JWT auth cookie), then the shared message-size, message-rate, and
 * idle-timeout limits for the life of the connection.
 */
class ConnectionManager implements MessageComponentInterface
{
    private const ARGS_TIMEOUT_SECONDS = 10;

    /** @var SplObjectStorage<ConnectionInterface, object> */
    protected SplObjectStorage $clients;

    private ?LoopInterface $loop = null;
    private ?TimerInterface $idleSweepTimer = null;
    private int $openConnections = 0;

    public function __construct()
    {
        $this->clients = new SplObjectStorage();
    }

    /**
     * Give the manager the event loop so it can run the first-frame timeout
     * and the idle sweep. Without a loop the wire still works; only the
     * time-based limits are disabled.
     */
    public function attachLoop(LoopInterface $loop): void
    {
        $this->loop = $loop;

        $this->idleSweepTimer ??= $loop->addPeriodicTimer(15, function (): void {
            $idleTimeout = self::idleTimeoutSeconds();
            $now = microtime(true);

            foreach ($this->clients as $conn) {
                $state = $this->clients[$conn];
                if ($now - $state->lastActivity >= $idleTimeout) {
                    $conn->close(1000);
                }
            }
        });
    }

    public function openConnectionCount(): int
    {
        return $this->openConnections;
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        if (!$this->isOriginAllowed($conn)) {
            $conn->close(1008);
            return;
        }

        if ($this->openConnections >= self::maxConnections()) {
            $conn->close(1013);
            return;
        }

        $entry = $this->resolveEntry($conn);
        if (is_string($entry)) {
            $this->refuse($conn, $entry);
            return;
        }

        $payload = $this->verifiedPayload($conn);

        $refusal = $this->authorize($entry, $payload);
        if ($refusal !== null) {
            $this->refuse($conn, $refusal);
            return;
        }

        $state = new \stdClass();
        $state->entry = $entry;
        $state->payload = $payload;
        $state->socket = null; // Set once the argument frame arrives.
        $state->lastActivity = microtime(true);
        $state->messageTimestamps = [];
        $state->argsTimer = $this->loop?->addTimer(
            self::ARGS_TIMEOUT_SECONDS,
            function () use ($conn): void {
                $this->refuse(
                    $conn,
                    'This socket opened and sent no arguments. The first frame '
                        . 'is the payload — one JSON object, {} when the function '
                        . 'takes nothing. pp.socket sends it on open.'
                );
            }
        );

        $this->clients->offsetSet($conn, $state);
        $this->openConnections++;
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        if (!$this->clients->offsetExists($from)) {
            return;
        }

        $state = $this->clients[$from];
        $state->lastActivity = microtime(true);

        if (strlen($msg) > self::maxMessageBytes()) {
            $state->socket?->handleClose();
            $from->close(1009);
            return;
        }

        // The argument frame: one JSON object, before anything else.
        if ($state->socket === null) {
            $this->cancelArgsTimer($state);

            $args = json_decode($msg, true);
            if (!is_array($args) || array_is_list($args) && $args !== []) {
                $this->refuse(
                    $from,
                    'The first frame of a socket is not a JSON object. '
                        . 'Arguments are named, so they arrive as { "room": ... } — '
                        . 'pp.socket("name", { room }) is what sends them.'
                );
                return;
            }

            $socket = new Socket($from, $state->entry['name'], $state->payload);
            $state->socket = $socket;

            try {
                ($state->entry['handler'])($socket, $args);
            } catch (Throwable $e) {
                $this->reportHandlerFailure($state->entry['name'], $socket, $e);
            }
            return;
        }

        if (!$this->allowMessage($state)) {
            $state->socket->error('Too many messages. Slow down.');
            return;
        }

        $value = json_decode($msg, true);
        if ($value === null && json_last_error() !== JSON_ERROR_NONE) {
            // A frame the handler cannot read is a client bug worth
            // surfacing, and it travels back as the error frame.
            $state->socket->error(
                '`' . $state->entry['name'] . '` could not read a frame. '
                    . 'Each frame is one JSON value.'
            );
            return;
        }

        try {
            $state->socket->handleMessage($value);
        } catch (Throwable $e) {
            $this->reportHandlerFailure($state->entry['name'], $state->socket, $e);
        }
    }

    public function onClose(ConnectionInterface $conn): void
    {
        if (!$this->clients->offsetExists($conn)) {
            return;
        }

        $state = $this->clients[$conn];
        $this->cancelArgsTimer($state);
        $this->clients->offsetUnset($conn);
        $this->openConnections--;

        $state->socket?->handleClose();
    }

    public function onError(ConnectionInterface $conn, Exception $e): void
    {
        echo "Socket connection error: {$e->getMessage()}" . PHP_EOL;
        $conn->close();
    }

    // ==== Handshake ====

    /**
     * @return array{name: string, handler: callable, requireAuth: bool, allowedRoles: string[]}|string
     */
    private function resolveEntry(ConnectionInterface $conn): array|string
    {
        $query = [];
        $request = $conn->httpRequest ?? null;
        if ($request !== null) {
            parse_str($request->getUri()->getQuery(), $query);
        }

        $name = trim((string) ($query['name'] ?? ''));
        if ($name === '') {
            return 'This connection named no socket. Open it as '
                . 'pp.socket("name", { ... }) — the client runtime sends the '
                . 'name in the `name` query parameter.';
        }

        $entry = SocketRegistry::get($name);
        if ($entry === null) {
            return "No socket named `$name`. Register it in "
                . 'src/Lib/Websocket/sockets.php with SocketRegistry::register() — '
                . 'the name the client connects with is the registered one.';
        }

        return $entry;
    }

    /**
     * The verified auth payload from the handshake's auth cookie, or null.
     * Verification is pure JWT (`Auth::verifyToken`), so it works in this
     * long-running process without a PHP session.
     */
    private function verifiedPayload(ConnectionInterface $conn): mixed
    {
        try {
            $request = $conn->httpRequest ?? null;
            if ($request === null) {
                return null;
            }

            $cookies = self::parseCookies($request->getHeaderLine('Cookie'));

            $authCookieName = strtolower(preg_replace(
                '/\s+/',
                '_',
                trim(Env::string('AUTH_COOKIE_NAME', 'auth_cookie_name_d36e5'))
            ));

            $jwt = $cookies[$authCookieName] ?? null;
            if ($jwt === null || $jwt === '') {
                return null;
            }

            return Auth::getInstance()->verifyToken($jwt);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param array{name: string, requireAuth: bool, allowedRoles: string[]} $entry
     */
    private function authorize(array $entry, mixed $payload): ?string
    {
        if ($payload !== null) {
            if (!empty($entry['allowedRoles'])) {
                $currentRole = null;

                if (is_scalar($payload)) {
                    $currentRole = $payload;
                } else {
                    $roleKey = !empty(Auth::ROLE_NAME) ? Auth::ROLE_NAME : 'role';

                    if (is_object($payload)) {
                        $currentRole = $payload->$roleKey ?? null;
                    } elseif (is_array($payload)) {
                        $currentRole = $payload[$roleKey] ?? null;
                    }
                }

                if ($currentRole === null || !in_array($currentRole, $entry['allowedRoles'], true)) {
                    return "The socket `{$entry['name']}` is not available to this account.";
                }
            }

            return null;
        }

        if ($entry['requireAuth'] || !empty($entry['allowedRoles'])) {
            return "The socket `{$entry['name']}` needs a signed-in session. "
                . 'It is registered with requireAuth, so it answers only while '
                . 'the browser carries one.';
        }

        return null;
    }

    /**
     * Anti-CSWSH origin check. NOT authentication: a browser cannot forge
     * the Origin header, so this blocks cross-site script-driven handshakes;
     * a raw client can send any origin, which is exactly why auth is a
     * separate gate.
     */
    private function isOriginAllowed(ConnectionInterface $conn): bool
    {
        $request = $conn->httpRequest ?? null;
        $origin = rtrim(trim((string) ($request?->getHeaderLine('Origin') ?? '')), '/');

        if ($origin === '') {
            // No Origin header: tolerate local tooling in dev, reject in production.
            return !self::isProduction();
        }

        $parts = parse_url($origin);
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return false;
        }

        $host = strtolower($parts['host']);
        if (!self::isProduction() && in_array($host, ['localhost', '127.0.0.1'], true)) {
            return strtolower($parts['scheme']) === 'http';
        }

        $allowedOrigins = [];
        foreach (['WEBSOCKET_ALLOWED_ORIGINS', 'CORS_ALLOWED_ORIGINS', 'APP_BASE_URL'] as $envName) {
            foreach (self::parseOriginList(Env::string($envName, '')) as $allowed) {
                $allowedOrigins[] = $allowed;
            }
        }

        // Same-origin fallback from the Host header is a development
        // convenience only — production must name its origins explicitly.
        if (!self::isProduction() && $request !== null) {
            $hostHeader = trim($request->getHeaderLine('Host'));
            if ($hostHeader !== '') {
                $allowedOrigins[] = 'http://' . $hostHeader;
                $allowedOrigins[] = 'https://' . $hostHeader;
            }
        }

        return in_array($origin, $allowedOrigins, true);
    }

    /**
     * Refuse after the handshake: the error frame, then the close, so the
     * browser gets a readable message instead of a bare close code.
     */
    private function refuse(ConnectionInterface $conn, string $message): void
    {
        if ($this->clients->offsetExists($conn)) {
            $state = $this->clients[$conn];
            $this->cancelArgsTimer($state);
        }

        try {
            $conn->send(json_encode(['error' => $message], JSON_UNESCAPED_UNICODE));
        } catch (Throwable) {
            // The browser is already gone; the close below is all that is left.
        }

        $conn->close(1008);
    }

    private function reportHandlerFailure(string $name, Socket $socket, Throwable $e): void
    {
        echo "[Socket Error] $name: {$e->getMessage()}" . PHP_EOL;

        $message = self::isProduction()
            ? 'Internal server error'
            : "$name: {$e->getMessage()}";

        $socket->error($message);
    }

    // ==== Limits ====

    private function allowMessage(object $state): bool
    {
        $now = microtime(true);
        $cutoff = $now - self::rateWindowSeconds();

        $state->messageTimestamps = array_values(array_filter(
            $state->messageTimestamps,
            static fn (float $timestamp): bool => $timestamp > $cutoff,
        ));

        if (count($state->messageTimestamps) >= self::messagesPerWindow()) {
            return false;
        }

        $state->messageTimestamps[] = $now;

        return true;
    }

    private function cancelArgsTimer(object $state): void
    {
        if ($state->argsTimer !== null && $this->loop !== null) {
            $this->loop->cancelTimer($state->argsTimer);
            $state->argsTimer = null;
        }
    }

    // ==== Settings (same env names and defaults as the reference server) ====

    private static function isProduction(): bool
    {
        return Env::string('APP_ENV', 'production') === 'production';
    }

    private static function idleTimeoutSeconds(): int
    {
        return max(10, Env::int('WEBSOCKET_IDLE_TIMEOUT_SECONDS', 120));
    }

    private static function maxMessageBytes(): int
    {
        return max(256, Env::int('MAX_WEBSOCKET_MESSAGE_BYTES', 4096));
    }

    private static function messagesPerWindow(): int
    {
        return max(1, Env::int('MAX_WEBSOCKET_MESSAGES_PER_WINDOW', 20));
    }

    private static function rateWindowSeconds(): int
    {
        return max(1, Env::int('WEBSOCKET_RATE_WINDOW_SECONDS', 10));
    }

    private static function maxConnections(): int
    {
        return max(1, Env::int('MAX_WEBSOCKET_CONNECTIONS', 200));
    }

    /**
     * Parse an origin list env value: CSV or a JSON array, the same formats
     * CorsMiddleware accepts.
     *
     * @return string[]
     */
    private static function parseOriginList(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '' || $raw === '[]') {
            return [];
        }

        $values = null;
        if ($raw[0] === '[') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $values = array_map('strval', $decoded);
            }
        }

        $values ??= explode(',', $raw);

        $origins = [];
        foreach ($values as $value) {
            $value = rtrim(trim($value), '/');
            if ($value !== '') {
                $origins[] = $value;
            }
        }

        return $origins;
    }

    /**
     * @return array<string, string>
     */
    private static function parseCookies(string $header): array
    {
        $cookies = [];

        foreach (explode(';', $header) as $pair) {
            $parts = explode('=', trim($pair), 2);
            if (count($parts) === 2 && $parts[0] !== '') {
                $cookies[strtolower($parts[0])] = urldecode($parts[1]);
            }
        }

        return $cookies;
    }
}
