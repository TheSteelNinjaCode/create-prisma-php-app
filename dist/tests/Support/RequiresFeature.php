<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Skip guard for tests of optional Prisma PHP features.
 *
 * Call `$this->requireFeature('websocket')` as the FIRST line of `setUp()`,
 * before touching any class from the feature's scaffold — a disabled
 * feature's files are not generated, so reaching them would fatal instead
 * of failing cleanly. A skipped test reports why and how to enable it.
 */
trait RequiresFeature
{
    protected function requireFeature(string $feature): void
    {
        if (!Features::enabled($feature)) {
            self::markTestSkipped(
                "The `$feature` feature is disabled in prisma-php.json; "
                    . "enable it and run `npx pp update project -y` to use this suite."
            );
        }
    }
}
