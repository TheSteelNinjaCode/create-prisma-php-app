# App tests

PHPUnit tests for the **application** code — `src/Lib/**`, the app's wire
contracts, and `src/Lib/Websocket/sockets.php` registrations — not the Prisma
PHP framework under `vendor/tsnc/prisma-php` (that package carries its own
suite in its source repo).

## The command

```bash
npm run test
```

That runs PHPUnit through `settings/run-tests.ts`, which uses the PHP binary
from `prisma-php.json` (`phpRootPathExe`) so the suite runs with the same PHP
the app runs on. It exits non-zero on any failure, so CI, a pre-commit hook,
or an agent knows exactly when something broke.

Narrow a run with PHPUnit's own flags after `--`:

```bash
npm run test -- --filter CsrfTest
npm run test -- --filter testValidTokenRoundTrip
```

Running PHPUnit directly also works: `php vendor/phpunit/phpunit/phpunit`
(configuration is picked up from `phpunit.xml` at the project root).

## Layout

One file per surface, flat in `tests/`:

| File | Surface |
| --- | --- |
| `bootstrap.php` | Shared setup: autoloader, path constants, deterministic test env |
| `Support/` | Reusable fakes (`Tests\Support\...`, autoloaded via composer `autoload-dev`) |
| `Support/Features.php` | Feature flags read from `prisma-php.json` |
| `Support/RequiresFeature.php` | Skip guard for tests of optional features |
| `FeaturesTest.php` | The suite's own feature awareness mirrors `prisma-php.json` |
| `CsrfTest.php` | The `pp_csrf` cookie family and `X-CSRF-Token` validation |
| `RpcWireContractTest.php` | PulsePoint wire headers (`$isRpc` / `$isNavigation` / `$isWire`), including the pin that the legacy header stays dead |
| `SocketTest.php` | One socket connection: JSON frames, reserved error shape, close semantics |
| `SocketRegistryTest.php` | Named-socket registration and duplicate refusal |
| `SocketPoolTest.php` | Broadcast and pruning |
| `ConnectionManagerTest.php` | The full named-socket wire: handshake refusals, argument frame, auth, limits |
| `SocketsRegistrationTest.php` | The app's real `sockets.php` loads and names its sockets |
| `AuthTest.php` | JWT round trip, tamper/expiry/foreign-secret rejection |

## The test environment is deterministic

`tests/bootstrap.php` does **not** load the real `.env`. It loads the composer
autoloader plus `settings/paths.php`, then sets deterministic defaults
(`APP_ENV=development`, a 32-byte `AUTH_SECRET`, `FUNCTION_CALL_SECRET`) only
when the variable is not already set — so the suite behaves the same on any
machine, never depends on real secrets, and CI can still override. The Prisma
PHP `bootstrap.php` at the project root (route resolution, rendering, CSRF
cookie issuing) is **not** booted; tests exercise app classes directly.

A test that needs a different env value must set it with `putenv(...)` and
restore the previous value in `tearDown()` (`PP\Env` reads `getenv()` first) —
see `ConnectionManagerTest::setEnv()` for the pattern.

## Optional features are optional in the suite too

`prisma-php.json` decides which optional scaffolds exist (`websocket`, `mcp`,
`swaggerDocs`, `prisma`, ...). A test for an optional feature must guard on
the flag, or a freshly generated app without that feature fatals instead of
passing:

```php
use Tests\Support\RequiresFeature;

final class MySocketTest extends TestCase
{
    use RequiresFeature;

    protected function setUp(): void
    {
        $this->requireFeature('websocket'); // FIRST line, before touching the scaffold
    }
}
```

When the flag is off the test reports itself as skipped with the reason and
the enable command — never as a failure. `tearDown()` still runs after a
skip, so teardown code must not assume the feature's classes exist (see
`SocketRegistryTest::resetRegistry()` for the `class_exists` guard).

The websocket suites (`SocketTest`, `SocketRegistryTest`, `SocketPoolTest`,
`ConnectionManagerTest`, `SocketsRegistrationTest`) are gated this way. Core
surfaces — CSRF, the RPC wire headers, auth — are always-on and never gated.

## Conventions

- one `SomethingTest.php` per surface, in the `Tests` namespace; shared fakes
  live in `tests/Support` under `Tests\Support`
- static registries (`SocketRegistry`) are reset in `setUp()`/`tearDown()` via
  reflection so tests never depend on each other's order
- superglobals a test touches (`$_SERVER`, `$_COOKIE`, env) are backed up in
  `setUp()` and restored in `tearDown()`
- wire tests assert **frames and close codes**, not internals:
  `Tests\Support\FakeConnection` records everything the server sends, so a
  test reads the conversation the browser would have seen
- expected framework failures are part of the contract — a refusal test
  asserts the readable `{"error": "..."}` frame (or HTTP status), not just
  "something failed"
- tests cover app-level code and the wire contracts the app depends on; do
  not test Prisma PHP internals from here — those belong to the package
  repo's own suite (`vendor/tsnc/prisma-php/tests` when vendored)

## For AI agents

Read this file plus `node_modules/prisma-php/dist/docs/testing.md` before
adding or changing tests. When you add an app feature with logic worth
protecting — an exposed function's validation, a socket handler, an auth
rule — add the matching `*Test.php` here in the same change, and run
`npm run test` before declaring the work done. A red suite is a finding to
fix, not to silence.
