<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Feature flags for the test suite, read from `prisma-php.json`.
 *
 * `prisma-php.json` is the single source of truth for which optional Prisma
 * PHP features are enabled in the current app (`websocket`, `mcp`,
 * `swaggerDocs`, `prisma`, `tailwindcss`, `typescript`, `backendOnly`).
 * Tests that exercise an optional feature's scaffold must guard on the flag —
 * when the feature is off, its files do not exist and the test must skip,
 * not fatal.
 */
final class Features
{
    /** @var array<string, mixed>|null */
    private static ?array $config = null;

    /** @return array<string, mixed> The parsed prisma-php.json. */
    public static function config(): array
    {
        if (self::$config === null) {
            $raw = @file_get_contents(DOCUMENT_PATH . '/prisma-php.json');
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            self::$config = is_array($decoded) ? $decoded : [];
        }

        return self::$config;
    }

    public static function enabled(string $feature): bool
    {
        return (self::config()[$feature] ?? false) === true;
    }
}
