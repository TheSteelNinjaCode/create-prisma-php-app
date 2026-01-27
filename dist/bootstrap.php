<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/settings/paths.php';

use Dotenv\Dotenv;
use Lib\Middleware\CorsMiddleware;

Dotenv::createImmutable(DOCUMENT_PATH)->load();
CorsMiddleware::handle();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

use PP\Request;
use PP\PrismaPHPSettings;
use PP\StateManager;
use Lib\Middleware\AuthMiddleware;
use Lib\Auth\Auth;
use PP\MainLayout;
use PP\PHPX\TemplateCompiler;
use PP\CacheHandler;
use PP\ErrorHandler;
use PP\Attributes\Exposed;
use PP\Streaming\SSE;
use PP\Security\RateLimiter;

final class Bootstrap extends RuntimeException
{
    public static string $contentToInclude = '';
    public static array $layoutsToInclude = [];
    public static string $requestFilePath = '';
    public static string $parentLayoutPath = '';
    public static bool $isParentLayout = false;
    public static bool $isContentIncluded = false;
    public static bool $isChildContentIncluded = false;
    public static bool $isContentVariableIncluded = false;
    public static bool $secondRequestC69CD = false;
    public static array $requestFilesData = [];

    private string $context;

    private static array $fileExistCache = [];
    private static array $regexCache = [];

    public function __construct(string $message, string $context = '', int $code = 0, ?Throwable $previous = null)
    {
        $this->context = $context;
        parent::__construct($message, $code, $previous);
    }

    public function getContext(): string
    {
        return $this->context;
    }

    public static function run(): void
    {
        date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');

        PrismaPHPSettings::init();
        Request::init();
        StateManager::init();
        MainLayout::init();
        ErrorHandler::registerHandlers();

        setcookie("pp_local_store_key", PrismaPHPSettings::$localStoreKey, [
            'expires' => time() + 3600,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => false,
            'samesite' => 'Lax',
        ]);

        self::setCsrfCookie();

        self::$secondRequestC69CD = Request::$data['secondRequestC69CD'] ?? false;

        if (Request::$isWire && !self::$secondRequestC69CD) {
            self::isLocalStoreCallback();
        }

        $contentInfo = self::determineContentToInclude();
        self::$contentToInclude = $contentInfo['path'] ?? '';
        self::$layoutsToInclude = $contentInfo['layouts'] ?? [];

        Request::$pathname = $contentInfo['pathname'] ? '/' . $contentInfo['pathname'] : '/';
        Request::$uri = $contentInfo['uri'] ? $contentInfo['uri'] : '/';
        Request::$decodedUri = Request::getDecodedUrl(Request::$uri);

        if (is_file(self::$contentToInclude)) {
            Request::$fileToInclude = basename(self::$contentToInclude);
        }

        if (self::fileExistsCached(self::$contentToInclude)) {
            Request::$fileToInclude = basename(self::$contentToInclude);
        }

        self::checkForDuplicateRoutes();
        self::authenticateUserToken();

        self::$requestFilePath = APP_PATH . Request::$pathname;

        if (!empty(self::$layoutsToInclude)) {
            self::$parentLayoutPath = self::$layoutsToInclude[0];
            self::$isParentLayout = true;
        } else {
            self::$parentLayoutPath = APP_PATH . '/layout.php';
            self::$isParentLayout = false;
        }

        self::$isContentVariableIncluded = self::containsChildren(self::$parentLayoutPath);
        if (!self::$isContentVariableIncluded) {
            self::$isContentIncluded = true;
        }

        self::$requestFilesData = PrismaPHPSettings::$includeFiles;

        ErrorHandler::checkFatalError();
    }

    private static function isLocalStoreCallback(): void
    {
        if (empty($_SERVER['HTTP_X_PP_FUNCTION'])) {
            return;
        }

        $callbackName = $_SERVER['HTTP_X_PP_FUNCTION'];

        if ($callbackName === PrismaPHPSettings::$localStoreKey) {
            self::validateCsrfToken();
            self::jsonExit(['success' => true, 'response' => 'localStorage updated']);
        }
    }

    private static function setCsrfCookie(): void
    {
        if (!isset($_COOKIE['prisma_php_csrf'])) {
            $secret = $_ENV['FUNCTION_CALL_SECRET'] ?? 'pp_default_insecure_secret';
            $nonce = bin2hex(random_bytes(16));
            $signature = hash_hmac('sha256', $nonce, $secret);
            $token = $nonce . '.' . $signature;

            setcookie('prisma_php_csrf', $token, [
                'expires'  => time() + 3600,
                'path'     => '/',
                'secure'   => true,
                'httponly' => false,
                'samesite' => 'Lax',
            ]);
            $_COOKIE['prisma_php_csrf'] = $token;
        }
    }

    private static function validateCsrfToken(): void
    {
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $cookieToken = $_COOKIE['prisma_php_csrf'] ?? '';
        $secret = $_ENV['FUNCTION_CALL_SECRET'] ?? '';

        if (empty($headerToken) || empty($cookieToken)) {
            self::jsonExit(['success' => false, 'error' => 'CSRF token missing']);
        }

        if (!hash_equals($cookieToken, $headerToken)) {
            self::jsonExit(['success' => false, 'error' => 'CSRF token mismatch']);
        }

        $parts = explode('.', $cookieToken);
        if (count($parts) !== 2) {
            self::jsonExit(['success' => false, 'error' => 'Invalid CSRF token format']);
        }

        [$nonce, $signature] = $parts;
        $expectedSignature = hash_hmac('sha256', $nonce, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            self::jsonExit(['success' => false, 'error' => 'Invalid CSRF token signature']);
        }
    }

    private static function fileExistsCached(string $path): bool
    {
        if (!isset(self::$fileExistCache[$path])) {
            self::$fileExistCache[$path] = file_exists($path);
        }
        return self::$fileExistCache[$path];
    }

    private static function pregMatchCached(string $pattern, string $subject): bool
    {
        $cacheKey = md5($pattern . $subject);
        if (!isset(self::$regexCache[$cacheKey])) {
            self::$regexCache[$cacheKey] = preg_match($pattern, $subject) === 1;
        }
        return self::$regexCache[$cacheKey];
    }

    private static function determineContentToInclude(): array
    {
        $requestUri = $_SERVER['REQUEST_URI'];
        $requestUri = empty($_SERVER['SCRIPT_URL']) ? trim(self::uriExtractor($requestUri)) : trim($requestUri);

        $scriptUrl = explode('?', $requestUri, 2)[0];
        $pathname = $_SERVER['SCRIPT_URL'] ?? $scriptUrl;
        $pathname = trim($pathname, '/');
        $baseDir = APP_PATH;
        $includePath = '';
        $layoutsToInclude = [];

        /** 
         * ============ Middleware Management ============
         * AuthMiddleware is invoked to handle authentication logic for the current route ($pathname).
         * ================================================
         */
        AuthMiddleware::handle($pathname);
        /** 
         * ============ End of Middleware Management ======
         * ================================================
         */

        $isDirectAccessToPrivateRoute = preg_match('/_/', $pathname);
        if ($isDirectAccessToPrivateRoute) {
            $sameSiteFetch = false;
            $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
            if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
                $sameSiteFetch = true;
            }

            if (!$sameSiteFetch) {
                return [
                    'path' => $includePath,
                    'layouts' => $layoutsToInclude,
                    'pathname' => $pathname,
                    'uri' => $requestUri
                ];
            }
        }

        if ($pathname) {
            $groupFolder = self::findGroupFolder($pathname);
            if ($groupFolder) {
                $path = __DIR__ . $groupFolder;
                if (self::fileExistsCached($path)) {
                    $includePath = $path;
                }
            }

            if (empty($includePath)) {
                $dynamicRoute = self::dynamicRoute($pathname);
                if ($dynamicRoute) {
                    $path = __DIR__ . $dynamicRoute;
                    if (self::fileExistsCached($path)) {
                        $includePath = $path;
                    }
                }
            }

            $layoutsToInclude = self::collectLayouts($pathname, $groupFolder, $dynamicRoute ?? null);
        } else {
            $contentData = self::getFilePrecedence();
            $includePath = $baseDir . $contentData['file'];
            $layoutsToInclude = self::collectRootLayouts($contentData['file']);
        }

        return [
            'path' => $includePath,
            'layouts' => $layoutsToInclude,
            'pathname' => $pathname,
            'uri' => $requestUri
        ];
    }

    private static function collectLayouts(string $pathname, ?string $groupFolder, ?string $dynamicRoute): array
    {
        $layoutsToInclude = [];
        $baseDir = APP_PATH;

        $rootLayout = $baseDir . '/layout.php';
        if (self::fileExistsCached($rootLayout)) {
            $layoutsToInclude[] = $rootLayout;
        }

        $groupName = null;
        $groupParentPath = '';
        $pathAfterGroup = '';

        if ($groupFolder) {
            $normalizedGroupFolder = str_replace('\\', '/', $groupFolder);

            if (preg_match('#^\.?/src/app/(.+)/\(([^)]+)\)/(.+)$#', $normalizedGroupFolder, $matches)) {
                $groupParentPath = $matches[1];
                $groupName = $matches[2];
                $pathAfterGroup = dirname($matches[3]);
                if ($pathAfterGroup === '.') {
                    $pathAfterGroup = '';
                }
            } elseif (preg_match('#^\.?/src/app/\(([^)]+)\)/(.+)$#', $normalizedGroupFolder, $matches)) {
                $groupName = $matches[1];
                $pathAfterGroup = dirname($matches[2]);
                if ($pathAfterGroup === '.') {
                    $pathAfterGroup = '';
                }
            }
        }

        if ($groupName && $groupParentPath) {
            $currentPath = $baseDir;
            foreach (explode('/', $groupParentPath) as $segment) {
                if (empty($segment)) continue;

                $currentPath .= '/' . $segment;
                $potentialLayoutPath = $currentPath . '/layout.php';

                if (self::fileExistsCached($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude, true)) {
                    $layoutsToInclude[] = $potentialLayoutPath;
                }
            }

            $groupLayoutPath = $baseDir . '/' . $groupParentPath . "/($groupName)/layout.php";
            if (self::fileExistsCached($groupLayoutPath)) {
                $layoutsToInclude[] = $groupLayoutPath;
            }

            if (!empty($pathAfterGroup)) {
                $currentPath = $baseDir . '/' . $groupParentPath . "/($groupName)";
                foreach (explode('/', $pathAfterGroup) as $segment) {
                    if (empty($segment)) continue;

                    $currentPath .= '/' . $segment;
                    $potentialLayoutPath = $currentPath . '/layout.php';

                    if (self::fileExistsCached($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude, true)) {
                        $layoutsToInclude[] = $potentialLayoutPath;
                    }
                }
            }
        } elseif ($groupName && !$groupParentPath) {
            $groupLayoutPath = $baseDir . "/($groupName)/layout.php";
            if (self::fileExistsCached($groupLayoutPath)) {
                $layoutsToInclude[] = $groupLayoutPath;
            }

            if (!empty($pathAfterGroup)) {
                $currentPath = $baseDir . "/($groupName)";
                foreach (explode('/', $pathAfterGroup) as $segment) {
                    if (empty($segment)) continue;

                    $currentPath .= '/' . $segment;
                    $potentialLayoutPath = $currentPath . '/layout.php';

                    if (self::fileExistsCached($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude, true)) {
                        $layoutsToInclude[] = $potentialLayoutPath;
                    }
                }
            }
        } else {
            $currentPath = $baseDir;
            foreach (explode('/', $pathname) as $segment) {
                if (empty($segment)) continue;

                $currentPath .= '/' . $segment;
                $potentialLayoutPath = $currentPath . '/layout.php';

                if ($potentialLayoutPath === $rootLayout) {
                    continue;
                }

                if (self::fileExistsCached($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude, true)) {
                    $layoutsToInclude[] = $potentialLayoutPath;
                }
            }
        }

        if (isset($dynamicRoute) && !empty($dynamicRoute)) {
            $currentDynamicPath = $baseDir;
            foreach (explode('/', $dynamicRoute) as $segment) {
                if (empty($segment) || $segment === 'src' || $segment === 'app') {
                    continue;
                }

                $currentDynamicPath .= '/' . $segment;
                $potentialDynamicRoute = $currentDynamicPath . '/layout.php';
                if (self::fileExistsCached($potentialDynamicRoute) && !in_array($potentialDynamicRoute, $layoutsToInclude, true)) {
                    $layoutsToInclude[] = $potentialDynamicRoute;
                }
            }
        }

        if (empty($layoutsToInclude)) {
            $layoutsToInclude = self::findFirstGroupLayout();
        }

        return $layoutsToInclude;
    }

    private static function collectRootLayouts(?string $matchedContentFile = null): array
    {
        $layoutsToInclude = [];
        $baseDir = APP_PATH;
        $rootLayout = $baseDir . '/layout.php';

        if (self::fileExistsCached($rootLayout)) {
            $layoutsToInclude[] = $rootLayout;
        } else {
            $layoutsToInclude = self::findFirstGroupLayout($matchedContentFile);

            if (empty($layoutsToInclude)) {
                return [];
            }
        }

        return $layoutsToInclude;
    }

    private static function findFirstGroupLayout(?string $matchedContentFile = null): array
    {
        $baseDir = APP_PATH;
        $layoutsToInclude = [];

        if (is_dir($baseDir)) {
            $items = scandir($baseDir);

            if ($matchedContentFile) {
                foreach ($items as $item) {
                    if ($item === '.' || $item === '..') {
                        continue;
                    }

                    if (preg_match('/^\([^)]+\)$/', $item)) {
                        if (strpos($matchedContentFile, "/$item/") === 0) {
                            $groupLayoutPath = $baseDir . '/' . $item . '/layout.php';
                            if (self::fileExistsCached($groupLayoutPath)) {
                                $layoutsToInclude[] = $groupLayoutPath;
                                return $layoutsToInclude;
                            }
                        }
                    }
                }
            }

            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }

                if (preg_match('/^\([^)]+\)$/', $item)) {
                    $groupLayoutPath = $baseDir . '/' . $item . '/layout.php';
                    if (self::fileExistsCached($groupLayoutPath)) {
                        $layoutsToInclude[] = $groupLayoutPath;
                        break;
                    }
                }
            }
        }

        return $layoutsToInclude;
    }

    private static function getFilePrecedence(): array
    {
        $baseDir = APP_PATH;
        $result = ['file' => null];

        foreach (PrismaPHPSettings::$routeFiles as $route) {
            if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
                continue;
            }
            if (preg_match('/^\.\/src\/app\/route\.php$/', $route)) {
                return ['file' => '/route.php'];
            }
            if (preg_match('/^\.\/src\/app\/index\.php$/', $route)) {
                return ['file' => '/index.php'];
            }
        }

        if (is_dir($baseDir)) {
            $items = scandir($baseDir);
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }

                if (preg_match('/^\([^)]+\)$/', $item)) {
                    $groupDir = $baseDir . '/' . $item;

                    if (file_exists($groupDir . '/route.php')) {
                        return ['file' => '/' . $item . '/route.php'];
                    }
                    if (file_exists($groupDir . '/index.php')) {
                        return ['file' => '/' . $item . '/index.php'];
                    }
                }
            }
        }

        return $result;
    }

    private static function uriExtractor(string $scriptUrl): string
    {
        $projectName = PrismaPHPSettings::$option->projectName ?? '';
        if (empty($projectName)) {
            return "/";
        }

        $escapedIdentifier = preg_quote($projectName, '/');
        if (preg_match("/(?:.*$escapedIdentifier)(\/.*)$/", $scriptUrl, $matches) && !empty($matches[1])) {
            return rtrim(ltrim($matches[1], '/'), '/');
        }

        return "/";
    }

    private static function findGroupFolder(string $pathname): string
    {
        $pathnameSegments = explode('/', $pathname);
        foreach ($pathnameSegments as $segment) {
            if (!empty($segment) && self::pregMatchCached('/^\(.*\)$/', $segment)) {
                return $segment;
            }
        }

        return self::matchGroupFolder($pathname) ?: '';
    }

    private static function dynamicRoute($pathname)
    {
        $pathnameMatch = null;
        $normalizedPathname = ltrim(str_replace('\\', '/', $pathname), './');
        $normalizedPathnameEdited = "src/app/$normalizedPathname";
        $pathnameSegments = explode('/', $normalizedPathnameEdited);

        foreach (PrismaPHPSettings::$routeFiles as $route) {
            $normalizedRoute = trim(str_replace('\\', '/', $route), '.');

            if (pathinfo($normalizedRoute, PATHINFO_EXTENSION) !== 'php') {
                continue;
            }

            $routeSegments = explode('/', ltrim($normalizedRoute, '/'));

            $filteredRouteSegments = array_values(array_filter($routeSegments, function ($segment) {
                return !preg_match('/\(.+\)/', $segment);
            }));

            $singleDynamic = (preg_match_all('/\[[^\]]+\]/', $normalizedRoute, $matches) === 1)
                && strpos($normalizedRoute, '[...') === false;
            $routeCount = count($filteredRouteSegments);
            if (in_array(end($filteredRouteSegments), ['index.php', 'route.php'])) {
                $expectedSegmentCount = $routeCount - 1;
            } else {
                $expectedSegmentCount = $routeCount;
            }

            if ($singleDynamic) {
                if (count($pathnameSegments) !== $expectedSegmentCount) {
                    continue;
                }

                $segmentMatch = self::singleDynamicRoute($pathnameSegments, $filteredRouteSegments);
                $index = array_search($segmentMatch, $filteredRouteSegments);

                if ($index !== false && isset($pathnameSegments[$index])) {
                    $trimSegmentMatch = trim($segmentMatch, '[]');
                    Request::$dynamicParams = new ArrayObject(
                        [$trimSegmentMatch => $pathnameSegments[$index]],
                        ArrayObject::ARRAY_AS_PROPS
                    );

                    $dynamicRoutePathname = str_replace($segmentMatch, $pathnameSegments[$index], $normalizedRoute);
                    $dynamicRoutePathname = preg_replace('/\(.+\)/', '', $dynamicRoutePathname);
                    $dynamicRoutePathname = preg_replace('/\/+/', '/', $dynamicRoutePathname);
                    $dynamicRoutePathnameDirname = rtrim(dirname($dynamicRoutePathname), '/');

                    $expectedPathname = rtrim('/src/app/' . $normalizedPathname, '/');

                    if ((strpos($normalizedRoute, 'route.php') !== false || strpos($normalizedRoute, 'index.php') !== false)
                        && $expectedPathname === $dynamicRoutePathnameDirname
                    ) {
                        $pathnameMatch = $normalizedRoute;
                        break;
                    }
                }
            } elseif (strpos($normalizedRoute, '[...') !== false) {
                $cleanedRoute = preg_replace('/\(.+\)/', '', $normalizedRoute);
                $cleanedRoute = preg_replace('/\/+/', '/', $cleanedRoute);
                $staticPart = preg_replace('/\[\.\.\..*?\].*/', '', $cleanedRoute);
                $staticSegments = array_filter(explode('/', $staticPart));
                $minRequiredSegments = count($staticSegments);

                if (count($pathnameSegments) < $minRequiredSegments) {
                    continue;
                }

                $cleanedNormalizedRoute = $cleanedRoute;
                $dynamicSegmentRoute = $staticPart;

                if (strpos("/src/app/$normalizedPathname", $dynamicSegmentRoute) === 0) {
                    $trimmedPathname = str_replace($dynamicSegmentRoute, '', "/src/app/$normalizedPathname");
                    $pathnameParts = $trimmedPathname === '' ? [] : explode('/', trim($trimmedPathname, '/'));

                    if (preg_match('/\[\.\.\.(.*?)\]/', $normalizedRoute, $matches)) {
                        $dynamicParam = $matches[1];
                        Request::$dynamicParams = new ArrayObject(
                            [$dynamicParam => $pathnameParts],
                            ArrayObject::ARRAY_AS_PROPS
                        );
                    }

                    if (strpos($normalizedRoute, 'route.php') !== false) {
                        $pathnameMatch = $normalizedRoute;
                        break;
                    }

                    if (strpos($normalizedRoute, 'index.php') !== false) {
                        $segmentMatch = "[...$dynamicParam]";

                        $dynamicRoutePathname = str_replace($segmentMatch, implode('/', $pathnameParts), $cleanedNormalizedRoute);
                        $dynamicRoutePathnameDirname = rtrim(dirname($dynamicRoutePathname), '/');
                        $expectedPathname = rtrim("/src/app/$normalizedPathname", '/');

                        if ($expectedPathname === $dynamicRoutePathnameDirname) {
                            $pathnameMatch = $normalizedRoute;
                            break;
                        }
                    }
                }
            }
        }

        return $pathnameMatch;
    }

    private static function matchGroupFolder(string $constructedPath): ?string
    {
        $bestMatch = null;
        $normalizedConstructedPath = ltrim(str_replace('\\', '/', $constructedPath), './');
        $routeFile = "/src/app/$normalizedConstructedPath/route.php";
        $indexFile = "/src/app/$normalizedConstructedPath/index.php";

        foreach (PrismaPHPSettings::$routeFiles as $route) {
            if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
                continue;
            }

            $normalizedRoute = trim(str_replace('\\', '/', $route), '.');
            $cleanedRoute = preg_replace('/\/\([^)]+\)/', '', $normalizedRoute);

            if ($cleanedRoute === $routeFile) {
                $bestMatch = $normalizedRoute;
                break;
            } elseif ($cleanedRoute === $indexFile && !$bestMatch) {
                $bestMatch = $normalizedRoute;
            }
        }

        if (!$bestMatch) {
            foreach (PrismaPHPSettings::$routeFiles as $route) {
                if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
                    continue;
                }

                $normalizedRoute = trim(str_replace('\\', '/', $route), '.');

                if (preg_match('/\/\(([^)]+)\)\//', $normalizedRoute, $matches)) {
                    $cleanedRoute = preg_replace('/\/\([^)]+\)/', '', $normalizedRoute);

                    if ($cleanedRoute === $routeFile || $cleanedRoute === $indexFile) {
                        $bestMatch = $normalizedRoute;
                        break;
                    }
                }
            }
        }

        return $bestMatch;
    }

    private static function singleDynamicRoute($pathnameSegments, $routeSegments)
    {
        $segmentMatch = "";
        foreach ($routeSegments as $index => $segment) {
            if (preg_match('/^\[[^\]]+\]$/', $segment)) {
                return $segment;
            } else {
                if (!isset($pathnameSegments[$index]) || $segment !== $pathnameSegments[$index]) {
                    return $segmentMatch;
                }
            }
        }
        return $segmentMatch;
    }

    private static function checkForDuplicateRoutes(): void
    {
        if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production') {
            return;
        }

        $normalizedRoutesMap = [];
        foreach (PrismaPHPSettings::$routeFiles as $route) {
            if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
                continue;
            }

            $routeWithoutGroups = preg_replace('/\(.*?\)/', '', $route);
            $routeTrimmed = ltrim($routeWithoutGroups, '.\\/');
            $routeTrimmed = preg_replace('#/{2,}#', '/', $routeTrimmed);
            $routeTrimmed = preg_replace('#\\\\{2,}#', '\\', $routeTrimmed);
            $routeNormalized = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $routeTrimmed);

            $normalizedRoutesMap[$routeNormalized][] = $route;
        }

        $errorMessages = [];
        foreach ($normalizedRoutesMap as $normalizedRoute => $originalRoutes) {
            $basename = basename($normalizedRoute);
            if ($basename === 'layout.php') {
                continue;
            }

            if (
                count($originalRoutes) > 1 &&
                strpos($normalizedRoute, DIRECTORY_SEPARATOR) !== false
            ) {
                if ($basename !== 'route.php' && $basename !== 'index.php') {
                    continue;
                }
                $errorMessages[] = "Duplicate route found after normalization: " . $normalizedRoute;
                foreach ($originalRoutes as $originalRoute) {
                    $errorMessages[] = "- Grouped original route: " . $originalRoute;
                }
            }
        }

        if (!empty($errorMessages)) {
            $errorMessageString = self::isAjaxOrXFileRequestOrRouteFile()
                ? implode("\n", $errorMessages)
                : implode("<br>", $errorMessages);

            ErrorHandler::modifyOutputLayoutForError($errorMessageString);
        }
    }

    public static function containsChildren($filePath): bool
    {
        if (!self::fileExistsCached($filePath)) {
            return false;
        }

        $fileContent = @file_get_contents($filePath);
        if ($fileContent === false) {
            return false;
        }

        $pattern = '/\<\?=\s*MainLayout::\$children\s*;?\s*\?>|echo\s*MainLayout::\$children\s*;?/';
        return (bool) preg_match($pattern, $fileContent);
    }

    private static function convertToArrayObject($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        if (empty($data)) {
            return $data;
        }

        $isAssoc = array_keys($data) !== range(0, count($data) - 1);

        if ($isAssoc) {
            $obj = new stdClass();
            foreach ($data as $key => $value) {
                $obj->$key = self::convertToArrayObject($value);
            }
            return $obj;
        } else {
            return array_map([self::class, 'convertToArrayObject'], $data);
        }
    }

    public static function wireCallback(): void
    {
        $callbackName = $_SERVER['HTTP_X_PP_FUNCTION'] ?? null;

        if (empty($callbackName)) {
            self::jsonExit(['success' => false, 'error' => 'Callback header not provided', 'response' => null]);
        }

        self::validateCsrfToken();

        if (!preg_match('/^[a-zA-Z0-9_:\->]+$/', $callbackName)) {
            self::jsonExit(['success' => false, 'error' => 'Invalid callback format']);
        }

        $data = self::getRequestData();
        $args = self::convertToArrayObject($data);

        $out = str_contains($callbackName, '->') || str_contains($callbackName, '::')
            ? self::dispatchMethod($callbackName, $args)
            : self::dispatchFunction($callbackName, $args);

        if ($out instanceof SSE) {
            $out->send();
            exit;
        }

        if ($out instanceof Generator) {
            (new SSE($out))->send();
            exit;
        }

        if ($out !== null) {
            self::jsonExit($out);
        }
        exit;
    }

    private static function jsonExit(mixed $payload): void
    {
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    private static function getRequestData(): array
    {
        if (!empty($_FILES)) {
            $data = $_POST;
            foreach ($_FILES as $key => $file) {
                $data[$key] = is_array($file['name'])
                    ? array_map(
                        fn($i) => [
                            'name'     => $file['name'][$i],
                            'type'     => $file['type'][$i],
                            'tmp_name' => $file['tmp_name'][$i],
                            'error'    => $file['error'][$i],
                            'size'     => $file['size'][$i],
                        ],
                        array_keys($file['name'])
                    )
                    : $file;
            }
            return $data;
        }

        $raw  = file_get_contents('php://input');
        $json = json_decode($raw, true);

        return (json_last_error() === JSON_ERROR_NONE) ? $json : $_POST;
    }

    private static function validateAccess(Exposed $attribute): bool
    {
        if ($attribute->requiresAuth || !empty($attribute->allowedRoles)) {
            $auth = Auth::getInstance();

            if (!$auth->isAuthenticated()) {
                return false;
            }

            if (!empty($attribute->allowedRoles)) {
                $payload = $auth->getPayload();
                $currentRole = null;

                if (is_scalar($payload)) {
                    $currentRole = $payload;
                } else {
                    $roleKey = !empty(Auth::ROLE_NAME) ? Auth::ROLE_NAME : 'role';

                    if (is_object($payload)) {
                        $currentRole = $payload->$roleKey ?? null;
                    } elseif (is_array($payload)) {
                        $currentRole = $payload[$roleKey] ?? null;
                    }
                }

                if ($currentRole === null || !in_array($currentRole, $attribute->allowedRoles)) {
                    return false;
                }
            }
        }

        return true;
    }

    private static function isFunctionAllowed(string $fn): bool
    {
        try {
            $ref = new ReflectionFunction($fn);
            $attrs = $ref->getAttributes(Exposed::class);

            if (empty($attrs)) {
                return false;
            }

            return self::validateAccess($attrs[0]->newInstance());
        } catch (Throwable) {
            return false;
        }
    }

    private static function isMethodAllowed(string $class, string $method): bool
    {
        try {
            $ref = new ReflectionMethod($class, $method);
            $attrs = $ref->getAttributes(Exposed::class);

            if (empty($attrs)) {
                return false;
            }

            return self::validateAccess($attrs[0]->newInstance());
        } catch (Throwable) {
            return false;
        }
    }

    private static function getExposedAttribute(string $classOrFn, ?string $method = null): ?Exposed
    {
        try {
            if ($method) {
                $ref = new ReflectionMethod($classOrFn, $method);
            } else {
                $ref = new ReflectionFunction($classOrFn);
            }

            $attrs = $ref->getAttributes(Exposed::class);
            return !empty($attrs) ? $attrs[0]->newInstance() : null;
        } catch (Throwable) {
            return null;
        }
    }

    private static function enforceRateLimit(Exposed $attribute, string $identifier): void
    {
        $limits = $attribute->limits;

        if (empty($limits)) {
            if ($attribute->requiresAuth) {
                $limits = $_ENV['RATE_LIMIT_AUTH'] ?? '10/minute';
            } else {
                $limits = $_ENV['RATE_LIMIT_RPC'] ?? '60/minute';
            }
        }

        if ($limits) {
            RateLimiter::verify($identifier, $limits);
        }
    }

    private static function dispatchFunction(string $fn, mixed $args)
    {
        $attribute = self::getExposedAttribute($fn);
        if (!$attribute) {
            return ['success' => false, 'error' => 'Function not callable from client'];
        }

        if (!self::validateAccess($attribute)) {
            return ['success' => false, 'error' => 'Permission denied'];
        }

        if (function_exists($fn) && is_callable($fn)) {
            try {
                self::enforceRateLimit($attribute, "fn:$fn");

                $res = call_user_func($fn, $args);

                if ($res instanceof Generator || $res instanceof SSE) {
                    return $res;
                }

                return $res;
            } catch (Throwable $e) {
                if ($e->getMessage() === 'Rate limit exceeded. Try again later.') {
                    return ['success' => false, 'error' => $e->getMessage()];
                }

                if (isset($_ENV['SHOW_ERRORS']) && $_ENV['SHOW_ERRORS'] === 'false') {
                    return ['success' => false, 'error' => 'An error occurred. Please try again later.'];
                } else {
                    return ['success' => false, 'error' => "Function error: {$e->getMessage()}"];
                }
            }
        }
        return ['success' => false, 'error' => 'Invalid callback'];
    }

    private static function dispatchMethod(string $call, mixed $args)
    {
        if (!self::isMethodAllowed(
            strpos($call, '->') !== false
                ? explode('->', $call, 2)[0]
                : explode('::', $call, 2)[0],
            strpos($call, '->') !== false
                ? explode('->', $call, 2)[1]
                : explode('::', $call, 2)[1]
        )) {
            return ['success' => false, 'error' => 'Method not callable from client'];
        }

        if (strpos($call, '->') !== false) {
            list($requested, $method) = explode('->', $call, 2);
            $isStatic = false;
        } else {
            list($requested, $method) = explode('::', $call, 2);
            $isStatic = true;
        }

        $class = $requested;
        if (!class_exists($class)) {
            if ($import = self::resolveClassImport($requested)) {
                require_once $import['file'];
                $class = $import['className'];
            }
        }

        if (!class_exists($class)) {
            return ['success' => false, 'error' => "Class '$requested' not found"];
        }
        $attribute = self::getExposedAttribute($class, $method);

        if (!$attribute) {
            return ['success' => false, 'error' => 'Method not callable from client'];
        }

        if (!self::validateAccess($attribute)) {
            return ['success' => false, 'error' => 'Permission denied'];
        }

        try {
            self::enforceRateLimit($attribute, "method:$class::$method");

            $res = null;
            if (!$isStatic) {
                $instance = new $class();
                if (!is_callable([$instance, $method])) throw new Exception("Method not callable");
                $res = call_user_func([$instance, $method], $args);
            } else {
                if (!is_callable([$class, $method])) throw new Exception("Static method invalid");
                $res = call_user_func([$class, $method], $args);
            }

            if ($res instanceof Generator || $res instanceof SSE) {
                return $res;
            }

            return $res;
        } catch (Throwable $e) {
            if ($e->getMessage() === 'Rate limit exceeded. Try again later.') {
                return ['success' => false, 'error' => $e->getMessage()];
            }

            if (isset($_ENV['SHOW_ERRORS']) && $_ENV['SHOW_ERRORS'] === 'false') {
                return ['success' => false, 'error' => 'An error occurred. Please try again later.'];
            } else {
                return ['success' => false, 'error' => "Call error: {$e->getMessage()}"];
            }
        }
    }

    private static function resolveClassImport(string $simpleClassKey): ?array
    {
        $logs = PrismaPHPSettings::$classLogFiles[$simpleClassKey] ?? [];
        if (!is_array($logs) || empty($logs)) {
            return null;
        }

        $currentImporter = str_replace('\\', '/', self::$requestFilePath);

        foreach ($logs as $entry) {
            $imp = str_replace('\\', '/', $entry['importer']);
            if (strpos($imp, $currentImporter) !== false) {
                $rel = str_replace('\\', '/', $entry['filePath']);
                if (preg_match('#^app/#', $rel)) {
                    $path = APP_PATH . '/' . preg_replace('#^app/#', '', $rel);
                } else {
                    $path = SRC_PATH . '/' . ltrim($rel, '/');
                }
                return ['file' => $path, 'className' => $entry['className']];
            }
        }

        $first = $logs[0];
        $rel   = str_replace('\\', '/', $first['filePath']);
        if (preg_match('#^app/#', $rel)) {
            $path = APP_PATH . '/' . preg_replace('#^app/#', '', $rel);
        } else {
            $path = SRC_PATH . '/' . ltrim($rel, '/');
        }
        return ['file' => $path, 'className' => $first['className']];
    }

    public static function getLoadingsFiles(): string
    {
        $loadingFiles = array_filter(PrismaPHPSettings::$routeFiles, function ($route) {
            $normalizedRoute = str_replace('\\', '/', $route);
            return preg_match('/\/loading\.php$/', $normalizedRoute);
        });

        $haveLoadingFileContent = array_reduce($loadingFiles, function ($carry, $route) {
            $normalizeUri = str_replace('\\', '/', $route);
            $fileUrl = str_replace('./src/app', '', $normalizeUri);
            $route = str_replace(['\\', './'], ['/', ''], $route);

            ob_start();
            include($route);
            $loadingContent = ob_get_clean();

            if ($loadingContent !== false) {
                $url = $fileUrl === '/loading.php'
                    ? '/'
                    : str_replace('/loading.php', '', $fileUrl);
                $carry .= '<div pp-loading-url="' . $url . '">' . $loadingContent . '</div>';
            }
            return $carry;
        }, '');

        if ($haveLoadingFileContent) {
            return '<div style="display: none;" id="loading-file-1B87E">' . $haveLoadingFileContent . '</div>';
        }
        return '';
    }

    public static function createUpdateRequestData(): void
    {
        if (Bootstrap::$contentToInclude === '') {
            return;
        }

        $requestJsonData = SETTINGS_PATH . '/request-data.json';

        if (file_exists($requestJsonData)) {
            $currentData = json_decode(file_get_contents($requestJsonData), true) ?? [];
        } else {
            $currentData = [];
        }

        $includedFiles = get_included_files();
        $srcAppFiles = [];
        foreach ($includedFiles as $filename) {
            if (strpos($filename, DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR) !== false) {
                $srcAppFiles[] = $filename;
            }
        }

        $currentUrl = Request::getDecodedUrl(Request::$uri);

        if (isset($currentData[$currentUrl])) {
            $currentData[$currentUrl]['includedFiles'] = array_values(array_unique(
                array_merge($currentData[$currentUrl]['includedFiles'], $srcAppFiles)
            ));

            if (!Request::$isWire && !self::$secondRequestC69CD) {
                $currentData[$currentUrl]['isCacheable'] = CacheHandler::$isCacheable;
            }
        } else {
            $currentData[$currentUrl] = [
                'url'         => Request::$uri,
                'fileName'    => self::convertUrlToFileName($currentUrl),
                'isCacheable' => CacheHandler::$isCacheable,
                'cacheTtl' => CacheHandler::$ttl,
                'includedFiles' => $srcAppFiles,
            ];
        }

        $existingData = file_exists($requestJsonData) ? file_get_contents($requestJsonData) : '';
        $newData = json_encode($currentData, JSON_PRETTY_PRINT);

        if ($existingData !== $newData) {
            file_put_contents($requestJsonData, $newData);
        }
    }

    private static function convertUrlToFileName(string $url): string
    {
        $url = trim($url, '/');
        $fileName = preg_replace('/[^a-zA-Z0-9-_]/', '_', $url);
        return $fileName ? mb_strtolower($fileName, 'UTF-8') : 'index';
    }

    private static function authenticateUserToken(): void
    {
        $token = Request::getBearerToken();
        if ($token) {
            $auth = Auth::getInstance();
            $verifyToken = $auth->verifyToken($token);
            if ($verifyToken) {
                $auth->signIn($verifyToken);
            }
        }
    }

    public static function isAjaxOrXFileRequestOrRouteFile(): bool
    {
        if (Request::$fileToInclude === 'index.php') {
            return false;
        }

        return Request::$isAjax || Request::$isXFileRequest || Request::$fileToInclude === 'route.php';
    }

    public static function applyRootLayoutId(string $html): string
    {
        $rootLayoutPath = self::$layoutsToInclude[0] ?? self::$parentLayoutPath;
        $rootLayoutId = !empty($rootLayoutPath) ? md5($rootLayoutPath) : 'default-root';

        header('X-PP-Root-Layout: ' . $rootLayoutId);

        $rootLayoutMeta = '<meta name="pp-root-layout" content="' . $rootLayoutId . '">';

        if (strpos($html, '<head>') !== false) {
            return preg_replace('/<head>/', "<head>\n    $rootLayoutMeta", $html, 1);
        }

        return $rootLayoutMeta . $html;
    }
}

Bootstrap::run();

try {
    if (empty(Bootstrap::$contentToInclude)) {
        if (!Request::$isXFileRequest && PrismaPHPSettings::$option->backendOnly) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Permission denied'
            ]);
            http_response_code(403);
            exit;
        }

        if (is_file(Bootstrap::$requestFilePath)) {
            if (file_exists(Bootstrap::$requestFilePath) && Request::$isXFileRequest) {
                if (pathinfo(Bootstrap::$requestFilePath, PATHINFO_EXTENSION) === 'php') {
                    include Bootstrap::$requestFilePath;
                } else {
                    header('Content-Type: ' . mime_content_type(Bootstrap::$requestFilePath));
                    readfile(Bootstrap::$requestFilePath);
                }
                exit;
            }
        } else if (PrismaPHPSettings::$option->backendOnly) {
            header('Content-Type: application/json');
            http_response_code(404);
            exit(json_encode(['success' => false, 'error' => 'Not found']));
        }
    }

    if (!empty(Bootstrap::$contentToInclude) && Request::$fileToInclude === 'route.php') {
        header('Content-Type: application/json');
        require_once Bootstrap::$contentToInclude;
        exit;
    }

    if (!empty(Bootstrap::$contentToInclude) && !empty(Request::$fileToInclude)) {
        ob_start();
        require_once Bootstrap::$contentToInclude;
        MainLayout::$children = ob_get_clean();

        if (count(Bootstrap::$layoutsToInclude) > 1) {
            $nestedLayouts = array_slice(Bootstrap::$layoutsToInclude, 1);

            foreach (array_reverse($nestedLayouts) as $layoutPath) {
                if (!Bootstrap::containsChildren($layoutPath)) {
                    Bootstrap::$isChildContentIncluded = true;
                }

                ob_start();
                require_once $layoutPath;
                MainLayout::$children = ob_get_clean();
            }
        }
    } else {
        ob_start();
        require_once APP_PATH . '/not-found.php';
        MainLayout::$children = ob_get_clean();

        http_response_code(404);
        CacheHandler::$isCacheable = false;
    }

    if (!Bootstrap::$isContentIncluded && !Bootstrap::$isChildContentIncluded) {
        if (!Bootstrap::$secondRequestC69CD) {
            Bootstrap::createUpdateRequestData();
        }

        if (Request::$isWire && !Bootstrap::$secondRequestC69CD) {
            if (isset(Bootstrap::$requestFilesData[Request::$decodedUri])) {
                foreach (Bootstrap::$requestFilesData[Request::$decodedUri]['includedFiles'] as $file) {
                    if (file_exists($file)) {
                        ob_start();
                        require_once $file;
                        MainLayout::$children .= ob_get_clean();
                    }
                }
            }
        }

        if (Request::$isWire && !Bootstrap::$secondRequestC69CD) {
            ob_end_clean();
            Bootstrap::wireCallback();
        }

        if ((!Request::$isWire && !Bootstrap::$secondRequestC69CD) && isset(Bootstrap::$requestFilesData[Request::$decodedUri])) {
            $shouldCache = CacheHandler::$isCacheable === true
                || (CacheHandler::$isCacheable === null && $_ENV['CACHE_ENABLED'] === 'true');

            if ($shouldCache) {
                CacheHandler::serveCache(Request::$decodedUri, intval($_ENV['CACHE_TTL'] ?? 600));
            }
        }

        MainLayout::$children .= Bootstrap::getLoadingsFiles();

        ob_start();
        if (file_exists(Bootstrap::$parentLayoutPath)) {
            require_once Bootstrap::$parentLayoutPath;
        } else {
            echo MainLayout::$children;
        }

        MainLayout::$html = ob_get_clean();
        MainLayout::$html = TemplateCompiler::compile(MainLayout::$html);
        MainLayout::$html = TemplateCompiler::injectDynamicContent(MainLayout::$html);
        MainLayout::$html = Bootstrap::applyRootLayoutId(MainLayout::$html);

        MainLayout::$html = "<!DOCTYPE html>\n" . MainLayout::$html;

        if (
            http_response_code() === 200
            && isset(Bootstrap::$requestFilesData[Request::$decodedUri]['fileName'])
            && $shouldCache
            && (!Request::$isWire && !Bootstrap::$secondRequestC69CD)
        ) {
            CacheHandler::saveCache(Request::$decodedUri, MainLayout::$html);
        }

        echo MainLayout::$html;
    } else {
        $layoutPath = Bootstrap::$isContentIncluded
            ? Bootstrap::$parentLayoutPath
            : (Bootstrap::$layoutsToInclude[0] ?? '');

        $message = "The layout file does not contain &lt;?php echo MainLayout::\$children; ?&gt; or &lt;?= MainLayout::\$children ?&gt;\n<strong>$layoutPath</strong>";
        $htmlMessage = "<div class='error'>The layout file does not contain &lt;?php echo MainLayout::\$children; ?&gt; or &lt;?= MainLayout::\$children ?&gt;<br><strong>$layoutPath</strong></div>";

        $errorDetails = Bootstrap::isAjaxOrXFileRequestOrRouteFile() ? $message : $htmlMessage;

        ErrorHandler::modifyOutputLayoutForError($errorDetails);
    }
} catch (Throwable $e) {
    if (Bootstrap::isAjaxOrXFileRequestOrRouteFile()) {
        $errorDetails = json_encode([
            'success' => false,
            'error' => [
                'type' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ]);
    } else {
        $errorDetails = ErrorHandler::formatExceptionForDisplay($e);
    }
    ErrorHandler::modifyOutputLayoutForError($errorDetails);
}
