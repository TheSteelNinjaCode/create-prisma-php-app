<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;
use Tests\Support\Features;

/**
 * The suite's own feature awareness: flags come from `prisma-php.json`, the
 * single source of truth for which optional scaffolds exist in this app.
 */
final class FeaturesTest extends TestCase
{
    public function testConfigIsReadFromPrismaPhpJson(): void
    {
        $raw = json_decode((string) file_get_contents(DOCUMENT_PATH . '/prisma-php.json'), true);

        self::assertIsArray($raw);
        self::assertSame($raw, Features::config());
    }

    public function testEnabledMirrorsTheBooleanFlags(): void
    {
        $config = Features::config();

        foreach (['websocket', 'mcp', 'swaggerDocs', 'prisma', 'tailwindcss', 'typescript'] as $flag) {
            self::assertSame(
                ($config[$flag] ?? false) === true,
                Features::enabled($flag),
                "Features::enabled('$flag') mirrors prisma-php.json"
            );
        }
    }

    public function testAnUnknownFlagIsDisabled(): void
    {
        self::assertFalse(Features::enabled('not-a-real-feature'));
    }
}
