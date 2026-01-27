<?php

declare(strict_types=1);

namespace Lib\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use DateInterval;
use DateTime;
use PP\Validator;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use PP\Request;
use Exception;
use InvalidArgumentException;
use ArrayObject;
use Lib\Prisma\Classes\UserData;

class Auth
{
    public const PAYLOAD_NAME = 'payload_name_8639D';
    public const ROLE_NAME = '';
    public const PAYLOAD_SESSION_KEY = 'payload_session_key_2183A';

    public static string $cookieName = '';

    private static ?Auth $instance = null;
    private const PPAUTH = 'ppauth';
    private string $secretKey;
    private string $defaultTokenValidity = '1h'; // Default to 1 hour

    private function __construct()
    {
        $this->secretKey = $_ENV['AUTH_SECRET'] ?? 'CD24eEv4qbsC5LOzqeaWbcr58mBMSvA4Mkii8GjRiHkt';
        self::$cookieName = self::getCookieName();
    }

    public static function getInstance(): Auth
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Authenticates a user and generates a JWT.
     * Optionally redirects the user to a default or custom URL.
     *
     * @param mixed $data User data (string or AuthRole).
     * @param string|null $tokenValidity Duration token is valid for (e.g., '1h'). Default is '1h'.
     * @param bool|string $redirect 
     * - If `false` (default): No redirect occurs; returns the JWT.
     * - If `true`: Redirects to `AuthConfig::DEFAULT_SIGNIN_REDIRECT`.
     * - If `string`: Redirects to the specified URL (e.g., '/dashboard').
     *
     * @return string Returns the encoded JWT as a string.
     * @throws InvalidArgumentException
     */
    public function signIn($data, ?string $tokenValidity = null, bool|string $redirect = false): string
    {
        if (!$this->secretKey) {
            throw new InvalidArgumentException("Secret key is required for authentication.");
        }

        $expirationTime = $this->calculateExpirationTime($tokenValidity ?? $this->defaultTokenValidity);

        if ($data instanceof AuthRole) {
            $data = $data->value;
        }

        $payload = [
            self::PAYLOAD_NAME => $data,
            'exp' => $expirationTime,
        ];

        $_SESSION[self::PAYLOAD_SESSION_KEY] = $payload;

        $jwt = JWT::encode($payload, $this->secretKey, 'HS256');

        if (!headers_sent()) {
            $this->setCookies($jwt, $expirationTime);

            $this->rotateCsrfToken();
        }

        if ($redirect === true) {
            Request::redirect(AuthConfig::DEFAULT_SIGNIN_REDIRECT);
        } elseif (is_string($redirect) && !empty($redirect)) {
            Request::redirect($redirect);
        }

        return $jwt;
    }

    /**
     * Checks if the user is authenticated based on the presence of the payload in the session.
     * Returns true if the user is authenticated, false otherwise.
     * 
     * @return bool Returns true if the user is authenticated, false otherwise.
     */
    public function isAuthenticated(): bool
    {
        if (!isset($_COOKIE[self::$cookieName])) {
            unset($_SESSION[self::PAYLOAD_SESSION_KEY]);
            return false;
        }

        if (Request::$fileToInclude === 'route.php') {
            $bearerToken = Request::getBearerToken();
            $verifyBearerToken = $this->verifyToken($bearerToken);
            if (!$verifyBearerToken) {
                return false;
            }
        }

        $jwt = $_COOKIE[self::$cookieName];
        $verifyToken = $this->verifyToken($jwt);
        if ($verifyToken === false) {
            return false;
        }

        if (!isset($_SESSION[self::PAYLOAD_SESSION_KEY])) {
            return false;
        }

        return true;
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
                    throw new InvalidArgumentException("Invalid duration format: {$duration}");
            }
        }

        throw new InvalidArgumentException("Invalid duration format: {$duration}");
    }

    /**
     * Verifies the JWT token and returns the decoded payload if the token is valid.
     * If the token is invalid or expired, null is returned.
     * 
     * @param string $jwt The JWT token to verify.
     * @return object|null Returns the decoded payload if the token is valid, or null if invalid or expired.
     */
    public function verifyToken(?string $jwt): ?object
    {
        try {
            if (!$jwt) return null;

            $token = JWT::decode($jwt, new Key($this->secretKey, 'HS256'));

            if (empty($token->{Auth::PAYLOAD_NAME})) return null;
            if (isset($token->exp) && time() >= $token->exp) return null;

            return $token;
        } catch (Exception) {
            return null;
        }
    }

    /**
     * Refreshes the JWT token by updating the expiration time and encoding the new payload into a JWT.
     * If the token validity duration is not specified, the default token validity period is used.
     * If possible (HTTP headers not yet sent), it also sets cookies with the new JWT for client-side storage.
     * 
     * @param string $jwt The JWT token to refresh.
     * @param string|null $tokenValidity Optional parameter specifying the duration the token is valid for (e.g., '10m', '1h').
     * If null, the default validity period set in the class property is used.
     * The format should be a number followed by a time unit ('s' for seconds, 'm' for minutes,
     * 'h' for hours, 'd' for days), and this is parsed to calculate the exact expiration time.
     * 
     * @return string Returns the refreshed JWT as a string.
     * 
     * @throws InvalidArgumentException Thrown if the token is invalid.
     */
    public function refreshToken(string $jwt, ?string $tokenValidity = null): string
    {
        $decodedToken = $this->verifyToken($jwt);

        if (!$decodedToken) {
            throw new InvalidArgumentException("Invalid token.");
        }

        $expirationTime = $this->calculateExpirationTime($tokenValidity ?? $this->defaultTokenValidity);
        $decodedToken->exp = $expirationTime;
        $newJwt = JWT::encode((array)$decodedToken, $this->secretKey, 'HS256');

        if (!headers_sent()) {
            $this->setCookies($newJwt, $expirationTime);
        }

        return $newJwt;
    }

    /**
     * Refreshes the current user's session if the provided User ID matches the currently authenticated user.
     * This allows silent updates of permissions or profile data without requiring a logout.
     * @param string $targetUserId The ID of the user being updated.
     * @param mixed $newUserData The fresh user object (e.g. from Prisma) to replace the session payload.
     * @return bool Returns true if the session was updated, false if the IDs did not match or no session exists.
     */
    public function refreshUserSession(string $targetUserId, mixed $newUserData): bool
    {
        $currentUser = $this->getPayload();

        if ($currentUser && isset($currentUser->id) && $currentUser->id === $targetUserId) {
            $this->signIn($newUserData, null, false);
            return true;
        }

        return false;
    }

    protected function setCookies(string $jwt, int $expirationTime)
    {
        if (!headers_sent()) {
            setcookie(self::$cookieName, $jwt, [
                'expires' => $expirationTime,
                'path' => '/',
                'domain' => '',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
    }

    public function rotateCsrfToken(): void
    {
        $secret = $_ENV['FUNCTION_CALL_SECRET'] ?? '';

        if (empty($secret)) {
            return;
        }

        $nonce = bin2hex(random_bytes(16));
        $signature = hash_hmac('sha256', $nonce, $secret);
        $token = $nonce . '.' . $signature;

        if (!headers_sent()) {
            setcookie('prisma_php_csrf', $token, [
                'expires'  => time() + 3600, // 1 hour validity
                'path'     => '/',
                'secure'   => true,
                'httponly' => false, // Must be FALSE so client JS can read it
                'samesite' => 'Lax',
            ]);
        }

        $_COOKIE['prisma_php_csrf'] = $token;
    }

    /**
     * Logs out the user by unsetting the session payload and deleting the authentication cookie.
     * If a redirect URL is provided, the user is redirected to that URL after logging out.
     * 
     * @param string|null $redirect Optional parameter specifying the URL to redirect to after logging out.
     * 
     * Example:
     * $auth = Auth::getInstance();
     * $auth->signOut('/login');
     * 
     * @return void
     */
    public function signOut(?string $redirect = null)
    {
        if (isset($_COOKIE[self::$cookieName])) {
            unset($_COOKIE[self::$cookieName]);
            setcookie(self::$cookieName, '', time() - 3600, '/');
        }

        if (isset($_SESSION[self::PAYLOAD_SESSION_KEY])) {
            unset($_SESSION[self::PAYLOAD_SESSION_KEY]);
        }

        $this->rotateCsrfToken();

        if ($redirect) {
            Request::redirect($redirect);
        }
    }

    /**
     * Returns the role of the authenticated user based on the payload stored in the session.
     * If the user is not authenticated, null is returned.
     * 
     * @return UserData|null Returns the role of the authenticated user or null if the user is not authenticated.
     */
    public function getPayload()
    {
        if (isset($_SESSION[self::PAYLOAD_SESSION_KEY])) {
            $value = $_SESSION[self::PAYLOAD_SESSION_KEY][self::PAYLOAD_NAME];
            return is_array($value) ? new ArrayObject($value, ArrayObject::ARRAY_AS_PROPS) : $value;
        }

        return null;
    }

    private function exchangeCode($data, $apiUrl)
    {
        try {
            $client = new Client();
            $response = $client->post($apiUrl, [
                'headers' => [
                    'Accept' => 'application/json',
                ],
                'form_params' => $data,
            ]);

            if ($response->getStatusCode() === 200) {
                return json_decode($response->getBody()->getContents());
            }

            return false;
        } catch (RequestException) {
            return false;
        }
    }

    private function saveAuthInfo($responseInfo, $accountData)
    {
        // Save user data to the database
    }

    private function findProvider(array $providers, string $type): ?object
    {
        foreach ($providers as $provider) {
            if (is_object($provider) && get_class($provider) === $type) {
                return $provider;
            }
        }
        return null;
    }

    /**
     * Authenticates a user using OAuth providers such as Google or GitHub.
     * The method first checks if the request is a GET request and if the route is a sign-in route.
     * It then processes the authentication code received from the provider and retrieves the user's data.
     * The user data is saved to the database, and the user is authenticated using the authenticate method.
     * 
     * @param mixed ...$providers An array of provider objects such as GoogleProvider or GithubProvider.
     * 
     * Example:
     * $auth = Auth::getInstance();
     * $auth->authProviders(new GoogleProvider('client_id', 'client_secret', 'redirect_uri'));
     */
    public function authProviders(...$providers)
    {
        $dynamicRouteParams = Request::$dynamicParams[self::PPAUTH] ?? [];

        if (Request::$isGet && in_array('signin', $dynamicRouteParams)) {
            foreach ($providers as $provider) {
                if ($provider instanceof GithubProvider && in_array('github', $dynamicRouteParams)) {
                    $githubAuthUrl = "https://github.com/login/oauth/authorize?scope=user:email%20read:user&client_id={$provider->clientId}";
                    Request::redirect($githubAuthUrl);
                } elseif ($provider instanceof GoogleProvider && in_array('google', $dynamicRouteParams)) {
                    $googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?"
                        . "scope=" . urlencode('email profile') . "&"
                        . "response_type=code&"
                        . "client_id=" . urlencode($provider->clientId) . "&"
                        . "redirect_uri=" . urlencode($provider->redirectUri);
                    Request::redirect($googleAuthUrl);
                }
            }
        }

        $authCode = Validator::string($_GET['code'] ?? '');

        if (Request::$isGet && in_array('callback', $dynamicRouteParams) && isset($authCode)) {
            if (in_array('github', $dynamicRouteParams)) {
                $provider = $this->findProvider($providers, GithubProvider::class);

                if (!$provider) {
                    exit("Error occurred. Please try again.");
                }

                return $this->githubProvider($provider, $authCode);
            } elseif (in_array('google', $dynamicRouteParams)) {
                $provider = $this->findProvider($providers, GoogleProvider::class);

                if (!$provider) {
                    exit("Error occurred. Please try again.");
                }

                return $this->googleProvider($provider, $authCode);
            }
        }

        exit("Error occurred. Please try again.");
    }

    private function githubProvider(GithubProvider $githubProvider, string $authCode)
    {
        $gitToken = [
            'client_id' => $githubProvider->clientId,
            'client_secret' => $githubProvider->clientSecret,
            'code' => $authCode,
        ];

        $apiUrl = 'https://github.com/login/oauth/access_token';
        $tokenData = (object)$this->exchangeCode($gitToken, $apiUrl);

        if (!$tokenData) {
            exit("Error occurred. Please try again.");
        }

        if (isset($tokenData->error)) {
            exit("Error occurred. Please try again.");
        }

        if (isset($tokenData->access_token)) {
            $client = new Client();
            $emailResponse = $client->get('https://api.github.com/user/emails', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenData->access_token,
                    'Accept' => 'application/json',
                ],
            ]);

            $emails = json_decode($emailResponse->getBody()->getContents(), true);

            $primaryEmail = array_reduce($emails, function ($carry, $item) {
                return ($item['primary'] && $item['verified']) ? $item['email'] : $carry;
            }, null);

            $response = $client->get('https://api.github.com/user', [
                'headers' => [
                    'Accept' => 'application/json',
                    'Authorization' => 'Bearer ' . $tokenData->access_token,
                ],
            ]);

            if ($response->getStatusCode() == 200) {
                $responseInfo = json_decode($response->getBody()->getContents());

                $accountData = [
                    'provider' => 'github',
                    'type' => 'oauth',
                    'providerAccountId' => "$responseInfo->id",
                    'access_token' => $tokenData->access_token,
                    'expires_at' => $tokenData->expires_at ?? null,
                    'token_type' => $tokenData->token_type,
                    'scope' => $tokenData->scope,
                ];

                $this->saveAuthInfo($responseInfo, $accountData);

                $userToAuthenticate = [
                    'name' => $responseInfo->login,
                    'email' => $primaryEmail,
                    'image' => $responseInfo->avatar_url,
                    'Account' => (object)$accountData
                ];
                $userToAuthenticate = (object)$userToAuthenticate;

                $this->signIn($userToAuthenticate, $githubProvider->maxAge);
            }
        }
    }

    private function googleProvider(GoogleProvider $googleProvider, string $authCode)
    {
        $googleToken = [
            'client_id' => $googleProvider->clientId,
            'client_secret' => $googleProvider->clientSecret,
            'code' => $authCode,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $googleProvider->redirectUri
        ];

        $apiUrl = 'https://oauth2.googleapis.com/token';
        $tokenData = (object)$this->exchangeCode($googleToken, $apiUrl);

        if (!$tokenData) {
            exit("Error occurred. Please try again.");
        }

        if (isset($tokenData->error)) {
            exit("Error occurred. Please try again.");
        }

        if (isset($tokenData->access_token)) {
            $client = new Client();
            $response = $client->get('https://www.googleapis.com/oauth2/v1/userinfo', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenData->access_token,
                    'Accept' => 'application/json',
                ],
            ]);

            if ($response->getStatusCode() == 200) {
                $responseInfo = json_decode($response->getBody()->getContents());

                $accountData = [
                    'provider' => 'google',
                    'type' => 'oauth',
                    'providerAccountId' => "$responseInfo->id",
                    'access_token' => $tokenData->access_token,
                    'expires_at' => $tokenData->expires_at ?? null,
                    'token_type' => $tokenData->token_type,
                    'scope' => $tokenData->scope,
                ];

                $this->saveAuthInfo($responseInfo, $accountData);

                $userToAuthenticate = [
                    'name' => $responseInfo->name,
                    'email' => $responseInfo->email,
                    'image' => $responseInfo->picture,
                    'Account' => (object)$accountData
                ];
                $userToAuthenticate = (object)$userToAuthenticate;

                $this->signIn($userToAuthenticate, $googleProvider->maxAge);
            }
        }
    }

    private static function getCookieName(): string
    {
        $authCookieName = $_ENV['AUTH_COOKIE_NAME'] ?? 'auth_cookie_name_d36e5';
        return strtolower(preg_replace('/\s+/', '_', trim($authCookieName)));
    }
}

class GoogleProvider
{
    public function __construct(
        public string $clientId,
        public string $clientSecret,
        public string $redirectUri,
        public string $maxAge = '30d'
    ) {}
}

class GithubProvider
{
    public function __construct(
        public string $clientId,
        public string $clientSecret,
        public string $maxAge = '30d'
    ) {}
}
