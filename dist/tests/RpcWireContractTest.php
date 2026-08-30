<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;
use PP\Request;

/**
 * The PulsePoint wire headers, as the app depends on them.
 *
 * `pp.rpc(...)` posts with `X-PP-RPC: true` + `X-PP-Function`; SPA navigation
 * fetches with `X-PP-Navigation: true`; both carry `X-PulsePoint-Wire: true`.
 * This is a complete migration — the legacy `PP-Wire-Request` header must NOT
 * be recognized any more, and that is pinned here on purpose.
 */
final class RpcWireContractTest extends TestCase
{
    private array $serverBackup = [];

    protected function setUp(): void
    {
        $this->serverBackup = $_SERVER;
    }

    protected function tearDown(): void
    {
        $_SERVER = $this->serverBackup;
    }

    private function initRequest(array $server): void
    {
        $_SERVER = array_merge([
            'HTTP_HOST' => 'example.test',
            'SCRIPT_NAME' => '/index.php',
            'REMOTE_ADDR' => '127.0.0.1',
        ], $server);

        Request::init();
    }

    public function testRpcPostIsDetected(): void
    {
        $this->initRequest([
            'REQUEST_METHOD' => 'POST',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_PULSEPOINT_WIRE' => 'true',
            'HTTP_X_PP_RPC' => 'true',
            'HTTP_X_PP_FUNCTION' => 'saveProfile',
        ]);

        self::assertTrue(Request::$isWire);
        self::assertTrue(Request::$isRpc);
        self::assertFalse(Request::$isNavigation);
    }

    public function testNavigationGetIsWireButNotRpc(): void
    {
        $this->initRequest([
            'REQUEST_METHOD' => 'GET',
            'HTTP_X_PULSEPOINT_WIRE' => 'true',
            'HTTP_X_PP_NAVIGATION' => 'true',
        ]);

        self::assertTrue(Request::$isWire);
        self::assertFalse(Request::$isRpc);
        self::assertTrue(Request::$isNavigation);
    }

    public function testRpcHeaderOnAGetIsNotAnRpc(): void
    {
        $this->initRequest([
            'REQUEST_METHOD' => 'GET',
            'HTTP_X_PP_RPC' => 'true',
        ]);

        self::assertFalse(Request::$isRpc);
    }

    public function testPlainRequestCarriesNoWireFlags(): void
    {
        $this->initRequest(['REQUEST_METHOD' => 'GET']);

        self::assertFalse(Request::$isWire);
        self::assertFalse(Request::$isRpc);
        self::assertFalse(Request::$isNavigation);
    }

    public function testLegacyWireHeaderIsNoLongerRecognized(): void
    {
        $this->initRequest([
            'REQUEST_METHOD' => 'POST',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PP_WIRE_REQUEST' => 'true',
        ]);

        self::assertFalse(Request::$isWire, 'complete migration: no legacy header support');
        self::assertFalse(Request::$isRpc);
    }
}
