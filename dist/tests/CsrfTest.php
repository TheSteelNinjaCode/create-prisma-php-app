<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;
use PP\Security\Csrf;

/**
 * The CSRF half of the RPC wire: the `pp_csrf` cookie family and the
 * double-submit validation of the `X-CSRF-Token` header.
 */
final class CsrfTest extends TestCase
{
    protected function setUp(): void
    {
        $this->clearCsrfCookies();
    }

    protected function tearDown(): void
    {
        $this->clearCsrfCookies();
    }

    private function clearCsrfCookies(): void
    {
        foreach (array_keys($_COOKIE) as $name) {
            if (str_starts_with((string) $name, 'pp_csrf')) {
                unset($_COOKIE[$name]);
            }
        }
    }

    public function testCookieFamilyUsesThePpCsrfNamesTheRuntimeReads(): void
    {
        $names = Csrf::cookieNames();

        self::assertNotEmpty($names);
        self::assertSame('pp_csrf', end($names), 'plain pp_csrf is always the fallback name');

        foreach ($names as $name) {
            self::assertStringStartsWith('pp_csrf', $name);
        }
    }

    public function testEnsureCookieMintsASignedTokenForEveryCookieName(): void
    {
        Csrf::ensureCookie();

        foreach (Csrf::cookieNames() as $name) {
            self::assertArrayHasKey($name, $_COOKIE);
            self::assertMatchesRegularExpression(
                '/^[0-9a-f]{32}\.[0-9a-f]{64}$/',
                $_COOKIE[$name],
                'token is nonce.hmac-sha256'
            );
        }

        $values = array_map(static fn (string $name) => $_COOKIE[$name], Csrf::cookieNames());
        self::assertCount(1, array_unique($values), 'every issued name carries the same token');
    }

    public function testEnsureCookieKeepsAnExistingValidToken(): void
    {
        Csrf::ensureCookie();
        $first = $_COOKIE['pp_csrf'];

        Csrf::ensureCookie();

        self::assertSame($first, $_COOKIE['pp_csrf']);
    }

    public function testRotateReplacesTheToken(): void
    {
        Csrf::ensureCookie();
        $first = $_COOKIE['pp_csrf'];

        Csrf::rotate();

        self::assertNotSame($first, $_COOKIE['pp_csrf']);
    }

    public function testValidTokenRoundTrip(): void
    {
        Csrf::ensureCookie();

        self::assertNull(Csrf::validateHeaderToken($_COOKIE['pp_csrf']));
    }

    public function testMissingHeaderTokenIsRefused(): void
    {
        Csrf::ensureCookie();

        self::assertSame('Missing CSRF token', Csrf::validateHeaderToken(''));
    }

    public function testHeaderThatMatchesNoCookieIsRefused(): void
    {
        Csrf::ensureCookie();

        self::assertSame(
            'Invalid CSRF token',
            Csrf::validateHeaderToken(str_repeat('a', 32) . '.' . str_repeat('b', 64))
        );
    }

    public function testTamperedSignatureIsRefusedEvenWhenTheCookieMatches(): void
    {
        // Double-submit alone is not enough: the signature must verify, so a
        // token an attacker planted (cookie tossing) without the secret fails.
        $forged = str_repeat('a', 32) . '.' . str_repeat('b', 64);
        foreach (Csrf::cookieNames() as $name) {
            $_COOKIE[$name] = $forged;
        }

        self::assertSame('Invalid CSRF token', Csrf::validateHeaderToken($forged));
    }
}
