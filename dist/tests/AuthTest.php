<?php

declare(strict_types=1);

namespace Tests;

use Firebase\JWT\JWT;
use Lib\Auth\Auth;
use PHPUnit\Framework\TestCase;
use PP\Env;

/**
 * The JWT session tokens both wires trust: RPC auth reads them through the
 * request session, and the socket server verifies the handshake cookie with
 * `verifyToken(...)` alone.
 */
final class AuthTest extends TestCase
{
    public function testSignInReturnsATokenThatVerifiesBackToThePayload(): void
    {
        $auth = Auth::getInstance();

        $jwt = $auth->signIn('admin');

        self::assertSame('admin', $auth->verifyToken($jwt));
    }

    public function testATamperedTokenVerifiesToNull(): void
    {
        $auth = Auth::getInstance();
        $jwt = $auth->signIn('admin');

        self::assertNull($auth->verifyToken($jwt . 'x'));
        self::assertNull($auth->verifyToken('not-a-jwt'));
        self::assertNull($auth->verifyToken(null));
    }

    public function testAnExpiredTokenVerifiesToNull(): void
    {
        $expired = JWT::encode(
            [Auth::PAYLOAD_NAME => 'admin', 'exp' => time() - 60],
            Env::string('AUTH_SECRET', ''),
            'HS256'
        );

        self::assertNull(Auth::getInstance()->verifyToken($expired));
    }

    public function testATokenSignedWithADifferentSecretVerifiesToNull(): void
    {
        $forged = JWT::encode(
            [Auth::PAYLOAD_NAME => 'admin', 'exp' => time() + 3600],
            'a-different-32-byte-signing-secret-key',
            'HS256'
        );

        self::assertNull(Auth::getInstance()->verifyToken($forged));
    }
}
