<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/settings/paths.php';

use Dotenv\Dotenv;
use Lib\Request;
use Lib\PrismaPHPSettings;
use Lib\StateManager;
use Lib\Middleware\AuthMiddleware;
use Lib\Auth\Auth;
use Lib\MainLayout;
use Lib\PHPX\TemplateCompiler;
use Lib\CacheHandler;
use Lib\ErrorHandler;

final class Bootstrap
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

    private static array $fileExistCache = [];
    private static array $regexCache = [];

    /**
     * Main entry point to run the entire routing and rendering logic.
     */
    public static function run(): void
    {
        // Load environment variables
        Dotenv::createImmutable(DOCUMENT_PATH)->load();

        // Set timezone
        date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');

        // Initialize essential classes
        PrismaPHPSettings::init();
        Request::init();
        StateManager::init();

        // Register custom handlers (exception, shutdown, error)
        ErrorHandler::registerHandlers();

        // Set a local store key as a cookie (before any output)
        setcookie("pphp_local_store_key", PrismaPHPSettings::$localStoreKey, time() + 3600, "/", "", false, false);

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
        self::$parentLayoutPath = APP_PATH . '/layout.php';

        self::$isParentLayout = !empty(self::$layoutsToInclude)
            && strpos(self::$layoutsToInclude[0], 'src/app/layout.php') !== false;

        self::$isContentVariableIncluded = self::containsChildren(self::$parentLayoutPath);
        if (!self::$isContentVariableIncluded) {
            self::$isContentIncluded = true;
        }

        self::$secondRequestC69CD = Request::$data['secondRequestC69CD'] ?? false;
        self::$requestFilesData = PrismaPHPSettings::$includeFiles;

        // Detect any fatal error that might have occurred before hitting this point
        ErrorHandler::checkFatalError();
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

        // Without query params
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

        // e.g., avoid direct access to _private files
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

        // Find matching route
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

            // Check for layout hierarchy
            $currentPath = $baseDir;
            $getGroupFolder = self::getGroupFolder($groupFolder);
            $modifiedPathname = $pathname;
            if (!empty($getGroupFolder)) {
                $modifiedPathname = trim($getGroupFolder, "/src/app/");
            }

            foreach (explode('/', $modifiedPathname) as $segment) {
                if (empty($segment)) {
                    continue;
                }

                $currentPath .= '/' . $segment;
                $potentialLayoutPath = $currentPath . '/layout.php';
                if (self::fileExistsCached($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude, true)) {
                    $layoutsToInclude[] = $potentialLayoutPath;
                }
            }

            // If it was a dynamic route, we also check for any relevant layout
            if (isset($dynamicRoute) && !empty($dynamicRoute)) {
                $currentDynamicPath = $baseDir;
                foreach (explode('/', $dynamicRoute) as $segment) {
                    if (empty($segment)) {
                        continue;
                    }
                    if ($segment === 'src' || $segment === 'app') {
                        continue;
                    }

                    $currentDynamicPath .= '/' . $segment;
                    $potentialDynamicRoute = $currentDynamicPath . '/layout.php';
                    if (self::fileExistsCached($potentialDynamicRoute) && !in_array($potentialDynamicRoute, $layoutsToInclude, true)) {
                        $layoutsToInclude[] = $potentialDynamicRoute;
                    }
                }
            }

            // If still no layout, fallback to the app-level layout.php
            if (empty($layoutsToInclude)) {
                $layoutsToInclude[] = $baseDir . '/layout.php';
            }
        } else {
            // If path is empty, we’re basically at "/"
            $includePath = $baseDir . self::getFilePrecedence();
        }

        return [
            'path' => $includePath,
            'layouts' => $layoutsToInclude,
            'pathname' => $pathname,
            'uri' => $requestUri
        ];
    }

    private static function getFilePrecedence(): ?string
    {
        foreach (PrismaPHPSettings::$routeFiles as $route) {
            if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
                continue;
            }
            if (preg_match('/^\.\/src\/app\/route\.php$/', $route)) {
                return '/route.php';
            }
            if (preg_match('/^\.\/src\/app\/index\.php$/', $route)) {
                return '/index.php';
            }
        }
        return null;
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
                if (count($pathnameSegments) <= $expectedSegmentCount) {
                    continue;
                }

                $cleanedNormalizedRoute = preg_replace('/\(.+\)/', '', $normalizedRoute);
                $cleanedNormalizedRoute = preg_replace('/\/+/', '/', $cleanedNormalizedRoute);
                $dynamicSegmentRoute = preg_replace('/\[\.\.\..*?\].*/', '', $cleanedNormalizedRoute);

                if (strpos("/src/app/$normalizedPathname", $dynamicSegmentRoute) === 0) {
                    $trimmedPathname = str_replace($dynamicSegmentRoute, '', "/src/app/$normalizedPathname");
                    $pathnameParts = explode('/', trim($trimmedPathname, '/'));

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
                        $index = array_search($segmentMatch, $filteredRouteSegments);

                        if ($index !== false && isset($pathnameSegments[$index])) {
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

        return $bestMatch;
    }

    private static function getGroupFolder($pathname): string
    {
        $lastSlashPos = strrpos($pathname, '/');
        if ($lastSlashPos === false) {
            return "";
        }

        $pathWithoutFile = substr($pathname, 0, $lastSlashPos);
        if (preg_match('/\(([^)]+)\)[^()]*$/', $pathWithoutFile, $matches)) {
            return $pathWithoutFile;
        }

        return "";
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
        // Skip checks in production
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

    public static function containsChildLayoutChildren($filePath): bool
    {
        if (!self::fileExistsCached($filePath)) {
            return false;
        }

        $fileContent = @file_get_contents($filePath);
        if ($fileContent === false) {
            return false;
        }

        // Check usage of MainLayout::$childLayoutChildren
        $pattern = '/\<\?=\s*MainLayout::\$childLayoutChildren\s*;?\s*\?>|echo\s*MainLayout::\$childLayoutChildren\s*;?/';
        return (bool) preg_match($pattern, $fileContent);
    }

    private static function containsChildren($filePath): bool
    {
        if (!self::fileExistsCached($filePath)) {
            return false;
        }

        $fileContent = @file_get_contents($filePath);
        if ($fileContent === false) {
            return false;
        }

        // Check usage of MainLayout::$children
        $pattern = '/\<\?=\s*MainLayout::\$children\s*;?\s*\?>|echo\s*MainLayout::\$children\s*;?/';
        return (bool) preg_match($pattern, $fileContent);
    }

    private static function convertToArrayObject($data)
    {
        return is_array($data) ? (object) $data : $data;
    }

    /**
     * Used specifically for wire (AJAX) calls.
     * Ends execution with JSON response.
     */
    public static function wireCallback()
    {
        try {
            // Initialize response
            $response = [
                'success' => false,
                'error' => 'Callback not provided',
                'data' => null
            ];

            $callbackResponse = null;
            $data = [];

            // Check if the request includes one or more files
            $hasFile = isset($_FILES['file']) && !empty($_FILES['file']['name'][0]);

            // Process form data
            if ($hasFile) {
                $data = $_POST;

                if (is_array($_FILES['file']['name'])) {
                    $files = [];
                    foreach ($_FILES['file']['name'] as $index => $name) {
                        $files[] = [
                            'name' => $name,
                            'type' => $_FILES['file']['type'][$index],
                            'tmp_name' => $_FILES['file']['tmp_name'][$index],
                            'error' => $_FILES['file']['error'][$index],
                            'size' => $_FILES['file']['size'][$index],
                        ];
                    }
                    $data['files'] = $files;
                } else {
                    $data['file'] = $_FILES['file'];
                }
            } else {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    $data = $_POST;
                }
            }

            // Validate and call the dynamic function
            if (isset($data['callback'])) {
                $callbackName = preg_replace('/[^a-zA-Z0-9_]/', '', $data['callback']);

                if (function_exists($callbackName) && is_callable($callbackName)) {
                    $dataObject = self::convertToArrayObject($data);
                    // Call the function
                    $callbackResponse = call_user_func($callbackName, $dataObject);

                    if (is_string($callbackResponse) || is_bool($callbackResponse)) {
                        $response = [
                            'success' => true,
                            'response' => $callbackResponse
                        ];
                    } else {
                        $response = [
                            'success' => true,
                            'response' => $callbackResponse
                        ];
                    }
                } else {
                    if ($callbackName === PrismaPHPSettings::$localStoreKey) {
                        $response = [
                            'success' => true,
                            'response' => 'localStorage updated'
                        ];
                    } else {
                        $response['error'] = 'Invalid callback';
                    }
                }
            } else {
                $response['error'] = 'No callback provided';
            }

            // Output the JSON response only if the callbackResponse is not null
            if ($callbackResponse !== null || isset($response['error'])) {
                echo json_encode($response);
            }
        } catch (Throwable $e) {
            $response = [
                'success' => false,
                'error' => 'Exception occurred',
                'message' => htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'),
                'file' => htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8'),
                'line' => (int) $e->getLine()
            ];

            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        }

        exit;
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
}

// ============================================================================
// Main Execution
// ============================================================================
Bootstrap::run();

try {
    // 1) If there's no content to include:
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

        // If the file physically exists on disk and we’re dealing with an X-File request
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

    // 2) If the chosen file is route.php -> output JSON
    if (!empty(Bootstrap::$contentToInclude) && Request::$fileToInclude === 'route.php') {
        header('Content-Type: application/json');
        require_once Bootstrap::$contentToInclude;
        exit;
    }

    // 3) If there is some valid content (index.php or something else)
    if (!empty(Bootstrap::$contentToInclude) && !empty(Request::$fileToInclude)) {
        // We only load the content now if we're NOT dealing with the top-level parent layout
        if (!Bootstrap::$isParentLayout) {
            ob_start();
            require_once Bootstrap::$contentToInclude;
            MainLayout::$childLayoutChildren = ob_get_clean();
        }

        // Then process all the reversed layouts in the chain
        foreach (array_reverse(Bootstrap::$layoutsToInclude) as $layoutPath) {
            if (Bootstrap::$parentLayoutPath === $layoutPath) {
                continue;
            }

            if (!Bootstrap::containsChildLayoutChildren($layoutPath)) {
                Bootstrap::$isChildContentIncluded = true;
            }

            ob_start();
            require_once $layoutPath;
            MainLayout::$childLayoutChildren = ob_get_clean();
        }
    } else {
        // Fallback: we include not-found.php
        ob_start();
        require_once APP_PATH . '/not-found.php';
        MainLayout::$childLayoutChildren = ob_get_clean();
    }

    // If the top-level layout is in use
    if (Bootstrap::$isParentLayout && !empty(Bootstrap::$contentToInclude)) {
        ob_start();
        require_once Bootstrap::$contentToInclude;
        MainLayout::$childLayoutChildren = ob_get_clean();
    }

    if (!Bootstrap::$isContentIncluded && !Bootstrap::$isChildContentIncluded) {
        // Provide request-data for SSR caching, if needed
        if (!Bootstrap::$secondRequestC69CD) {
            Bootstrap::createUpdateRequestData();
        }

        // If there’s caching
        if (isset(Bootstrap::$requestFilesData[Request::$decodedUri])) {
            if ($_ENV['CACHE_ENABLED'] === 'true') {
                CacheHandler::serveCache(Request::$decodedUri, intval($_ENV['CACHE_TTL']));
            }
        }

        // For wire calls, re-include the files if needed
        if (Request::$isWire && !Bootstrap::$secondRequestC69CD) {
            if (isset(Bootstrap::$requestFilesData[Request::$decodedUri])) {
                foreach (Bootstrap::$requestFilesData[Request::$decodedUri]['includedFiles'] as $file) {
                    if (file_exists($file)) {
                        ob_start();
                        require_once $file;
                        MainLayout::$childLayoutChildren .= ob_get_clean();
                    }
                }
            }
        }

        // If it’s a wire request, handle wire callback
        if (Request::$isWire && !Bootstrap::$secondRequestC69CD) {
            ob_end_clean();
            Bootstrap::wireCallback();
        }

        MainLayout::$children = MainLayout::$childLayoutChildren . Bootstrap::getLoadingsFiles();

        ob_start();
        require_once APP_PATH . '/layout.php';
        MainLayout::$html = ob_get_clean();
        MainLayout::$html = TemplateCompiler::compile(MainLayout::$html);
        MainLayout::$html = TemplateCompiler::injectDynamicContent(MainLayout::$html);
        MainLayout::$html = "<!DOCTYPE html>\n" . MainLayout::$html;

        if (isset(Bootstrap::$requestFilesData[Request::$decodedUri]['fileName']) && $_ENV['CACHE_ENABLED'] === 'true') {
            CacheHandler::saveCache(Request::$decodedUri, MainLayout::$html);
        }

        echo MainLayout::$html;
    } else {
        $layoutPath = Bootstrap::$isContentIncluded
            ? Bootstrap::$parentLayoutPath
            : (Bootstrap::$layoutsToInclude[0] ?? '');

        $message = "The layout file does not contain &lt;?php echo MainLayout::\$childLayoutChildren; ?&gt; or &lt;?= MainLayout::\$childLayoutChildren ?&gt;\n<strong>$layoutPath</strong>";
        $htmlMessage = "<div class='error'>The layout file does not contain &lt;?php echo MainLayout::\$childLayoutChildren; ?&gt; or &lt;?= MainLayout::\$childLayoutChildren ?&gt;<br><strong>$layoutPath</strong></div>";

        if (Bootstrap::$isContentIncluded) {
            $message = "The parent layout file does not contain &lt;?php echo MainLayout::\$children; ?&gt; Or &lt;?= MainLayout::\$children ?&gt;<br><strong>$layoutPath</strong>";
            $htmlMessage = "<div class='error'>The parent layout file does not contain &lt;?php echo MainLayout::\$children; ?&gt; Or &lt;?= MainLayout::\$children ?&gt;<br><strong>$layoutPath</strong></div>";
        }

        $errorDetails = Bootstrap::isAjaxOrXFileRequestOrRouteFile() ? $message : $htmlMessage;

        ErrorHandler::modifyOutputLayoutForError($errorDetails);
    }
} catch (Throwable $e) {
    if (Bootstrap::isAjaxOrXFileRequestOrRouteFile()) {
        $errorDetails = "Unhandled Exception: " . $e->getMessage() .
            " in " . $e->getFile() .
            " on line " . $e->getLine();
    } else {
        $errorDetails = "Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
        $errorDetails .= "<br>File: " . htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8');
        $errorDetails .= "<br>Line: " . htmlspecialchars((string)$e->getLine(), ENT_QUOTES, 'UTF-8');
        $errorDetails .= "<br/>TraceAsString: " . htmlspecialchars($e->getTraceAsString(), ENT_QUOTES, 'UTF-8');
        $errorDetails = "<div class='error'>{$errorDetails}</div>";
    }
    ErrorHandler::modifyOutputLayoutForError($errorDetails);
}
