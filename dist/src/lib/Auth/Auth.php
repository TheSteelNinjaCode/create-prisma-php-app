<?php

namespace Lib\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use DateInterval;
use DateTime;

class Auth
{
    public const PAYLOAD_NAME = 'role';
    public const PAYLOAD = 'payload';
    public const COOKIE_NAME = 'auth_token';

    private $secretKey;
    private $defaultTokenValidity = '1h'; // Default to 1 hour

    public function __construct()
    {
        $this->secretKey = $_ENV['AUTH_SECRET'];
    }

    /**
     * Authenticates a user and generates a JWT (JSON Web Token) based on the specified user role
     * and token validity duration. The method first checks if the secret key is set, calculates
     * the token's expiration time, sets the necessary payload, and encodes it into a JWT.
     * If possible (HTTP headers not yet sent), it also sets cookies with the JWT for client-side storage.
     *
     * @param mixed $role A role identifier which can be a simple string or an instance of AuthRole.
     *                    If an instance of AuthRole is provided, its `value` property will be used as the role in the token.
     * @param string|null $tokenValidity Optional parameter specifying the duration the token is valid for (e.g., '10m', '1h').
     *                                   If null, the default validity period set in the class property is used.
     *                                   The format should be a number followed by a time unit ('s' for seconds, 'm' for minutes,
     *                                   'h' for hours, 'd' for days), and this is parsed to calculate the exact expiration time.
     *
     * @return string Returns the encoded JWT as a string.
     *
     * @throws InvalidArgumentException Thrown if the secret key is not set or if the duration format is invalid.
     *
     * Example:
     *   $auth = new Authentication();
     *   $auth->setSecretKey('your_secret_key');
     *   try {
     *       $jwt = $auth->authenticate('Admin', '1h');
     *       echo "JWT: " . $jwt;
     *   } catch (\InvalidArgumentException $e) {
     *       echo "Error: " . $e->getMessage();
     *   }
     */
    public function authenticate($role, string $tokenValidity = null): string
    {
        if (!$this->secretKey) {
            throw new \InvalidArgumentException("Secret key is required for authentication.");
        }

        $expirationTime = $this->calculateExpirationTime($tokenValidity ?? $this->defaultTokenValidity);

        if ($role instanceof AuthRole) {
            $role = $role->value;
        }

        $payload = [
            self::PAYLOAD_NAME => $role,
            'exp' => $expirationTime,
        ];

        // Set the payload in the session
        $_SESSION[self::PAYLOAD] = $payload;

        // Encode the JWT
        $jwt = JWT::encode($payload, $this->secretKey, 'HS256');

        if (!headers_sent()) {
            $this->setCookies($jwt, $expirationTime);
        }

        return $jwt;
    }

    public function isAuthenticated(): bool
    {
        return isset($_SESSION[self::PAYLOAD]);
    }

    private function calculateExpirationTime(string $duration): int
    {
        $now = new DateTime();
        $interval = $this->convertDurationToInterval($duration);
        $futureDate = $now->add($interval);
        return $futureDate->getTimestamp();
    }

    private function convertDurationToInterval(string $duration): DateInterval
    {
        if (preg_match('/^(\d+)(s|m|h|d)$/', $duration, $matches)) {
            $value = (int)$matches[1];
            $unit = $matches[2];

            switch ($unit) {
                case 's':
                    return new DateInterval("PT{$value}S");
                case 'm':
                    return new DateInterval("PT{$value}M");
                case 'h':
                    return new DateInterval("PT{$value}H");
                case 'd':
                    return new DateInterval("P{$value}D");
                default:
                    throw new \InvalidArgumentException("Invalid duration format: {$duration}");
            }
        }

        throw new \InvalidArgumentException("Invalid duration format: {$duration}");
    }

    public function verifyToken(string $jwt)
    {
        try {
            return JWT::decode($jwt, new Key($this->secretKey, 'HS256'));
        } catch (\Exception $e) {
            throw new \InvalidArgumentException("Invalid token.");
        }
    }

    public function refreshToken(string $jwt, string $tokenValidity = null): string
    {
        $decodedToken = $this->verifyToken($jwt);

        if (!$decodedToken) {
            throw new \InvalidArgumentException("Invalid token.");
        }

        $expirationTime = $this->calculateExpirationTime($tokenValidity ?? $this->defaultTokenValidity);

        $decodedToken->exp = $expirationTime;
        $newJwt = JWT::encode((array)$decodedToken, $this->secretKey, 'HS256');

        if (!headers_sent()) {
            $this->setCookies($newJwt, $expirationTime);
        }

        return $newJwt;
    }

    protected function setCookies(string $jwt, int $expirationTime)
    {
        if (!headers_sent()) {
            setcookie(self::COOKIE_NAME, $jwt, [
                'expires' => $expirationTime,
                'path' => '/',
                'domain' => '', // Specify your domain
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax', // or 'Strict' depending on your requirements
            ]);
        }
    }

    public function logout(string $redirect = null)
    {
        if (isset($_COOKIE[self::COOKIE_NAME])) {
            unset($_COOKIE[self::COOKIE_NAME]);
            setcookie(self::COOKIE_NAME, '', time() - 3600, '/');
        }

        if (isset($_SESSION[self::PAYLOAD])) {
            unset($_SESSION[self::PAYLOAD]);
        }

        if ($redirect) {
            redirect($redirect);
        }
    }

    public function getPayload()
    {
        if (isset($_SESSION[self::PAYLOAD])) {
            return $_SESSION[self::PAYLOAD][self::PAYLOAD_NAME];
        }

        return null;
    }
}
