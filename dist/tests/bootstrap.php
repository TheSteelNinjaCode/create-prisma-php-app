<?php

declare(strict_types=1);

/**
 * Shared PHPUnit setup for the app-level test suite.
 *
 * Mirrors what the runtime gives app code — the composer autoloader and the
 * path constants from `settings/paths.php` — without booting the framework:
 * `bootstrap.php` (route resolution, CSRF cookie, rendering) is NOT loaded
 * here, so tests exercise app classes directly.
 *
 * The real `.env` is deliberately NOT loaded. Tests run against deterministic
 * environment defaults so the suite behaves the same on any machine and can
 * never depend on (or leak) real secrets. Each default is only applied when
 * the variable is not already set, so CI can still override.
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once dirname(__DIR__) . '/settings/paths.php';

// Keep the app in its non-production code paths during tests (dev origin
// relaxations, readable error messages).
if (getenv('APP_ENV') === false) {
    putenv('APP_ENV=development');
    $_ENV['APP_ENV'] = 'development';
}

// Deterministic secrets so Auth and Csrf construct without a real .env.
// HS256 requires at least 32 bytes of key material.
if (getenv('AUTH_SECRET') === false) {
    putenv('AUTH_SECRET=test-secret-not-for-production-32bytes');
    $_ENV['AUTH_SECRET'] = 'test-secret-not-for-production-32bytes';
}

if (getenv('FUNCTION_CALL_SECRET') === false) {
    putenv('FUNCTION_CALL_SECRET=test-function-call-secret');
    $_ENV['FUNCTION_CALL_SECRET'] = 'test-function-call-secret';
}

// Auth::signIn writes the session payload; give CLI tests a session store.
if (!isset($_SESSION)) {
    $_SESSION = [];
}
