<?php

declare(strict_types=1);

namespace Lib\Middleware;

use PP\Env;

final class CorsMiddleware
{
    public static function handle(?array $overrides = null): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return;
        }

        $cfg = self::buildConfig($overrides);
        $cfg = self::allowImplicitLoopbackOrigin($origin, $cfg);

        if ($cfg['allowCredentials'] && self::listHasWildcard($cfg['allowedOrigins'])) {
            return;
        }

        if (!self::isAllowedOrigin($origin, $cfg['allowedOrigins'])) {
            return;
        }

        $sendWildcard = (!$cfg['allowCredentials'] && self::listHasWildcard($cfg['allowedOrigins']));
        $allowOriginValue = $sendWildcard ? '*' : self::normalize($origin);

        header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

        header('Access-Control-Allow-Origin: ' . $allowOriginValue);
        if ($cfg['allowCredentials']) {
            header('Access-Control-Allow-Credentials: true');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            $requestedHeaders = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? '';
            $allowedHeaders = $cfg['allowedHeaders'] !== ''
                ? $cfg['allowedHeaders']
                : ($requestedHeaders ?: 'Content-Type, Authorization, X-Requested-With');

            header('Access-Control-Allow-Methods: ' . $cfg['allowedMethods']);
            header('Access-Control-Allow-Headers: ' . $allowedHeaders);
            if ($cfg['maxAge'] > 0) {
                header('Access-Control-Max-Age: ' . (string) $cfg['maxAge']);
            }

            // Optional: Private Network Access preflights (Chrome)
            if (!empty($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_PRIVATE_NETWORK'])) {
                header('Access-Control-Allow-Private-Network: true');
            }

            http_response_code(204);
            header('Content-Length: 0');
            exit;
        }

        if ($cfg['exposeHeaders'] !== '') {
            header('Access-Control-Expose-Headers: ' . $cfg['exposeHeaders']);
        }
    }

    private static function buildConfig(?array $overrides): array
    {
        $allowed = self::parseList(Env::string('CORS_ALLOWED_ORIGINS', ''));
        $cfg = [
            'allowedOrigins'   => $allowed,
            'allowCredentials' => Env::bool('CORS_ALLOW_CREDENTIALS', false),
            'allowedMethods'   => Env::string('CORS_ALLOWED_METHODS', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'),
            'allowedHeaders'   => trim(Env::string('CORS_ALLOWED_HEADERS', '')),
            'exposeHeaders'    => trim(Env::string('CORS_EXPOSE_HEADERS', '')),
            'maxAge'           => Env::int('CORS_MAX_AGE', 86400),
        ];

        if (is_array($overrides)) {
            foreach ($overrides as $k => $v) {
                if (array_key_exists($k, $cfg)) {
                    $cfg[$k] = $v;
                }
            }
        }

        $cfg['allowedOrigins'] = array_map([self::class, 'normalize'], $cfg['allowedOrigins']);
        return $cfg;
    }

    private static function allowImplicitLoopbackOrigin(string $origin, array $cfg): array
    {
        if ($cfg['allowedOrigins'] !== []) {
            return $cfg;
        }

        if (!self::isImplicitLoopbackOrigin($origin)) {
            return $cfg;
        }

        $cfg['allowedOrigins'] = [self::normalize($origin)];
        return $cfg;
    }

    private static function parseList(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') return [];

        if ($raw[0] === '[') {
            $arr = json_decode($raw, true);
            if (is_array($arr)) {
                return array_values(array_filter(array_map('strval', $arr), 'strlen'));
            }
        }
        return array_values(array_filter(array_map('trim', explode(',', $raw)), 'strlen'));
    }

    private static function normalize(string $origin): string
    {
        return rtrim($origin, '/');
    }

    private static function isImplicitLoopbackOrigin(string $origin): bool
    {
        $originParts = parse_url(self::normalize($origin));
        if (!is_array($originParts)) {
            return false;
        }

        $originHost = strtolower((string) ($originParts['host'] ?? ''));
        $originScheme = strtolower((string) ($originParts['scheme'] ?? ''));
        $requestHost = self::getRequestHost();
        $requestScheme = self::isHttpsRequest() ? 'https' : 'http';

        if (
            $originHost === '' ||
            $requestHost === '' ||
            $originHost !== $requestHost ||
            $originScheme !== $requestScheme
        ) {
            return false;
        }

        return self::isLoopbackHost($originHost);
    }

    private static function getRequestHost(): string
    {
        $host = (string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '');
        if ($host === '') {
            return '';
        }

        $parts = parse_url('http://' . $host);
        if (is_array($parts) && isset($parts['host'])) {
            return strtolower((string) $parts['host']);
        }

        return strtolower(explode(':', $host, 2)[0]);
    }

    private static function isLoopbackHost(string $host): bool
    {
        return in_array(trim(strtolower($host), '[]'), ['localhost', '127.0.0.1', '::1'], true);
    }

    private static function isHttpsRequest(): bool
    {
        return (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
        );
    }

    private static function isAllowedOrigin(string $origin, array $list): bool
    {
        $o = self::normalize($origin);

        foreach ($list as $pattern) {
            $p = self::normalize($pattern);

            if ($p === '*') return true;

            if ($o === 'null' && strtolower($p) === 'null') return true;

            if (strpos($p, '*') !== false) {
                $regex = '/^' . str_replace('\*', '[^.]+', preg_quote($p, '/')) . '$/i';
                if (preg_match($regex, $o)) return true;
            } else {
                if (strcasecmp($p, $o) === 0) return true;
            }
        }
        return false;
    }

    private static function listHasWildcard(array $list): bool
    {
        foreach ($list as $p) {
            if (trim($p) === '*') return true;
        }
        return false;
    }
}
