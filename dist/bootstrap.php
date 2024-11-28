<?php

if (session_status() == PHP_SESSION_NONE) {
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
use Lib\PHPX\IPHPX;

$dotenv = Dotenv::createImmutable(\DOCUMENT_PATH);
$dotenv->load();

PrismaPHPSettings::init();
Request::init();
StateManager::init();

date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');

function determineContentToInclude()
{
    /** 
     * ============ URI Handling ============ 
     * The $requestUri variable now contains the full URI including query parameters. 
     * Examples: 
     * - Home page: '/' 
     * - Dynamic routes with parameters (e.g., '/dashboard?v=2' or '/profile?id=5') 
     * ======================================
     */
    $requestUri = $_SERVER['REQUEST_URI'];
    $requestUri = empty($_SERVER['SCRIPT_URL']) ? trim(uriExtractor($requestUri)) : trim($requestUri);
    /** 
     * ============ URI Path Handling ============ 
     * The $uri variable now contains the URI path without query parameters and without the leading slash. 
     * Examples: 
     * - Home page: '' (empty string) 
     * - Dynamic routes (e.g., '/dashboard?v=2' or '/profile?id=5') -> Only the path part is returned (e.g., 'dashboard' or 'profile'), without the query parameters. 
     * ============================================
     */
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
            return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'pathname' => $pathname, 'uri' => $requestUri];
        }
    }

    if ($pathname) {
        $groupFolder = findGroupFolder($pathname);
        if ($groupFolder) {
            $path = __DIR__ . $groupFolder;
            if (file_exists($path)) {
                $includePath = $path;
            }
        }

        if (empty($includePath)) {
            $dynamicRoute = dynamicRoute($pathname);
            if ($dynamicRoute) {
                $path = __DIR__ . $dynamicRoute;
                if (file_exists($path)) {
                    $includePath = $path;
                }
            }
        }

        $currentPath = $baseDir;
        $getGroupFolder = getGroupFolder($groupFolder);
        $modifiedPathname = $pathname;
        if (!empty($getGroupFolder)) {
            $modifiedPathname = trim($getGroupFolder, "/src/app/");
        }

        foreach (explode('/', $modifiedPathname) as $segment) {
            if (empty($segment)) continue;

            $currentPath .= '/' . $segment;
            $potentialLayoutPath = $currentPath . '/layout.php';
            if (file_exists($potentialLayoutPath) && !in_array($potentialLayoutPath, $layoutsToInclude)) {
                $layoutsToInclude[] = $potentialLayoutPath;
            }
        }

        if (isset($dynamicRoute)) {
            $currentDynamicPath = $baseDir;
            foreach (explode('/', $dynamicRoute) as $segment) {
                if (empty($segment)) continue;

                if ($segment === 'src' || $segment === 'app') continue;

                $currentDynamicPath .= '/' . $segment;
                $potentialDynamicRoute = $currentDynamicPath . '/layout.php';
                if (file_exists($potentialDynamicRoute) && !in_array($potentialDynamicRoute, $layoutsToInclude)) {
                    $layoutsToInclude[] = $potentialDynamicRoute;
                }
            }
        }

        if (empty($layoutsToInclude)) {
            $layoutsToInclude[] = $baseDir . '/layout.php';
        }
    } else {
        $includePath = $baseDir . getFilePrecedence();
    }

    return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'pathname' => $pathname, 'uri' => $requestUri];
}

function getFilePrecedence()
{
    foreach (PrismaPHPSettings::$routeFiles as $route) {
        // Check if the file has a .php extension
        if (pathinfo($route, PATHINFO_EXTENSION) !== 'php') {
            continue; // Skip files that are not PHP files
        }

        // Check for route.php first
        if (preg_match('/^\.\/src\/app\/route\.php$/', $route)) {
            return '/route.php';
        }

        // If route.php is not found, check for index.php
        if (preg_match('/^\.\/src\/app\/index\.php$/', $route)) {
            return '/index.php';
        }
    }

    // If neither file is found, return null
    return null;
}

function uriExtractor(string $scriptUrl): string
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

function findGroupFolder($pathname): string
{
    $pathnameSegments = explode('/', $pathname);
    foreach ($pathnameSegments as $segment) {
        if (!empty($segment)) {
            if (isGroupIdentifier($segment)) {
                return $segment;
            }
        }
    }

    $matchedGroupFolder = matchGroupFolder($pathname);
    if ($matchedGroupFolder) {
        return $matchedGroupFolder;
    } else {
        return '';
    }
}

function dynamicRoute($pathname)
{
    $pathnameMatch = null;
    $normalizedPathname = ltrim(str_replace('\\', '/', $pathname), './');
    $normalizedPathnameEdited = "src/app/$normalizedPathname";
    $pathnameSegments = explode('/', $normalizedPathnameEdited);

    foreach (PrismaPHPSettings::$routeFiles as $route) {
        $normalizedRoute = trim(str_replace('\\', '/', $route), '.');

        // Skip non-.php files to improve performance
        if (pathinfo($normalizedRoute, PATHINFO_EXTENSION) !== 'php') {
            continue;
        }

        $routeSegments = explode('/', ltrim($normalizedRoute, '/'));

        $filteredRouteSegments = array_values(array_filter($routeSegments, function ($segment) {
            return !preg_match('/\(.+\)/', $segment); // Skip segments with parentheses (groups)
        }));

        $singleDynamic = preg_match_all('/\[[^\]]+\]/', $normalizedRoute, $matches) === 1 && strpos($normalizedRoute, '[...') === false;

        if ($singleDynamic) {
            $segmentMatch = singleDynamicRoute($pathnameSegments, $filteredRouteSegments);
            $index = array_search($segmentMatch, $filteredRouteSegments);

            if ($index !== false && isset($pathnameSegments[$index])) {
                $trimSegmentMatch = trim($segmentMatch, '[]');
                Request::$dynamicParams = new \ArrayObject([$trimSegmentMatch => $pathnameSegments[$index]], \ArrayObject::ARRAY_AS_PROPS);

                $dynamicRoutePathname = str_replace($segmentMatch, $pathnameSegments[$index], $normalizedRoute);
                $dynamicRoutePathname = preg_replace('/\(.+\)/', '', $dynamicRoutePathname);
                $dynamicRoutePathname = preg_replace('/\/+/', '/', $dynamicRoutePathname);
                $dynamicRoutePathnameDirname = rtrim(dirname($dynamicRoutePathname), '/');

                $expectedPathname = rtrim('/src/app/' . $normalizedPathname, '/');

                if (strpos($normalizedRoute, 'route.php') !== false || strpos($normalizedRoute, 'index.php') !== false) {
                    if ($expectedPathname === $dynamicRoutePathnameDirname) {
                        $pathnameMatch = $normalizedRoute;
                        break;
                    }
                }
            }
        } elseif (strpos($normalizedRoute, '[...') !== false) {
            // Clean and normalize the route
            $cleanedNormalizedRoute = preg_replace('/\(.+\)/', '', $normalizedRoute);
            $cleanedNormalizedRoute = preg_replace('/\/+/', '/', $cleanedNormalizedRoute);
            $dynamicSegmentRoute = preg_replace('/\[\.\.\..*?\].*/', '', $cleanedNormalizedRoute);

            // Check if the normalized pathname starts with the cleaned route
            if (strpos("/src/app/$normalizedPathname", $dynamicSegmentRoute) === 0) {
                $trimmedPathname = str_replace($dynamicSegmentRoute, '', "/src/app/$normalizedPathname");
                $pathnameParts = explode('/', trim($trimmedPathname, '/'));

                // Extract the dynamic segment content
                if (preg_match('/\[\.\.\.(.*?)\]/', $normalizedRoute, $matches)) {
                    $dynamicParam = $matches[1];
                    Request::$dynamicParams = new \ArrayObject([$dynamicParam => $pathnameParts], \ArrayObject::ARRAY_AS_PROPS);
                }

                // Check for 'route.php'
                if (strpos($normalizedRoute, 'route.php') !== false) {
                    $pathnameMatch = $normalizedRoute;
                    break;
                }

                // Handle matching routes ending with 'index.php'
                if (strpos($normalizedRoute, 'index.php') !== false) {
                    $segmentMatch = "[...$dynamicParam]";
                    $index = array_search($segmentMatch, $filteredRouteSegments);

                    if ($index !== false && isset($pathnameSegments[$index])) {
                        // Generate the dynamic pathname
                        $dynamicRoutePathname = str_replace($segmentMatch, implode('/', $pathnameParts), $cleanedNormalizedRoute);
                        $dynamicRoutePathnameDirname = rtrim(dirname($dynamicRoutePathname), '/');

                        $expectedPathname = rtrim("/src/app/$normalizedPathname", '/');

                        // Compare the expected and dynamic pathname
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

function isGroupIdentifier($segment): bool
{
    return preg_match('/^\(.*\)$/', $segment);
}

function matchGroupFolder($constructedPath): ?string
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

function getGroupFolder($pathname): string
{
    $lastSlashPos = strrpos($pathname, '/');
    $pathWithoutFile = substr($pathname, 0, $lastSlashPos);

    if (preg_match('/\(([^)]+)\)[^()]*$/', $pathWithoutFile, $matches)) {
        return $pathWithoutFile;
    }

    return "";
}

function singleDynamicRoute($pathnameSegments, $routeSegments)
{
    $segmentMatch = "";
    foreach ($routeSegments as $index => $segment) {
        if (preg_match('/^\[[^\]]+\]$/', $segment)) {
            return "{$segment}";
        } else {
            if ($segment !== $pathnameSegments[$index]) {
                return $segmentMatch;
            }
        }
    }
    return $segmentMatch;
}

function checkForDuplicateRoutes()
{
    if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production') return;

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
        if ($basename === 'layout.php') continue;

        if (count($originalRoutes) > 1 && strpos($normalizedRoute, DIRECTORY_SEPARATOR) !== false) {
            if ($basename !== 'route.php' && $basename !== 'index.php') continue;

            $errorMessages[] = "Duplicate route found after normalization: " . $normalizedRoute;

            foreach ($originalRoutes as $originalRoute) {
                $errorMessages[] = "- Grouped original route: " . $originalRoute;
            }
        }
    }

    if (!empty($errorMessages)) {
        if (isAjaxOrXFileRequestOrRouteFile()) {
            $errorMessageString = implode("\n", $errorMessages);
        } else {
            $errorMessageString = implode("<br>", $errorMessages);
        }
        modifyOutputLayoutForError($errorMessageString);
    }
}

function containsChildLayoutChildren($filePath)
{
    $fileContent = file_get_contents($filePath);

    // Updated regular expression to match MainLayout::$childLayoutChildren
    $pattern = '/\<\?=\s*MainLayout::\$childLayoutChildren\s*;?\s*\?>|echo\s*MainLayout::\$childLayoutChildren\s*;?/';

    // Return true if MainLayout::$childLayoutChildren variables are found, false otherwise
    return preg_match($pattern, $fileContent) === 1;
}

function containsChildren($filePath)
{
    $fileContent = file_get_contents($filePath);

    // Updated regular expression to match MainLayout::$children
    $pattern = '/\<\?=\s*MainLayout::\$children\s*;?\s*\?>|echo\s*MainLayout::\$children\s*;?/';
    // Return true if the new content variables are found, false otherwise
    return preg_match($pattern, $fileContent) === 1;
}

function convertToArrayObject($data)
{
    if (is_array($data)) {
        $arrayObject = new \ArrayObject([], \ArrayObject::ARRAY_AS_PROPS);
        foreach ($data as $key => $value) {
            $arrayObject[$key] = convertToArrayObject($value);
        }
        return $arrayObject;
    }
    return $data;
}

function wireCallback()
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
            // Handle file upload, including multiple files
            $data = $_POST; // Form data will be available in $_POST

            if (is_array($_FILES['file']['name'])) {
                // Multiple files uploaded
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
                // Single file uploaded
                $data['file'] = $_FILES['file']; // Attach single file information to data
            }
        } else {
            // Handle non-file form data (likely JSON)
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // Fallback to handle form data in POST (non-JSON)
                $data = $_POST;
            }
        }

        // Validate and call the dynamic function
        if (isset($data['callback'])) {
            // Sanitize and create a dynamic function name
            $callbackName = preg_replace('/[^a-zA-Z0-9_]/', '', $data['callback']); // Sanitize the callback name

            // Check if the dynamic function is defined and callable
            if (function_exists($callbackName) && is_callable($callbackName)) {
                $dataObject = convertToArrayObject($data);

                // Call the function dynamically
                $callbackResponse = call_user_func($callbackName, $dataObject);

                // Handle different types of responses
                if (is_string($callbackResponse) || is_bool($callbackResponse)) {
                    // Prepare success response
                    $response = [
                        'success' => true,
                        'response' => $callbackResponse
                    ];
                } else {
                    // Handle non-string, non-boolean responses
                    $response = [
                        'success' => true,
                        'response' => $callbackResponse
                    ];
                }
            } else {
                // Invalid callback provided
                $response['error'] = 'Invalid callback';
            }
        } else {
            $response['error'] = 'No callback provided';
        }

        // Output the JSON response only if the callbackResponse is not null
        if ($callbackResponse !== null) {
            echo json_encode($response);
        }
    } catch (Throwable $e) {
        // Handle any exceptions and prepare an error response
        $response = [
            'success' => false,
            'error' => 'Exception occurred',
            'message' => htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'),
            'file' => htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8'),
            'line' => $e->getLine()
        ];

        // Output the error response
        echo json_encode($response);
    }

    exit;
}

function getLoadingsFiles()
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
            $url = $fileUrl === '/loading.php' ? '/' : str_replace('/loading.php', '', $fileUrl);
            $carry .= '<div pp-loading-url="' . $url . '">' . $loadingContent . '</div>';
        }

        return $carry;
    }, '');

    if ($haveLoadingFileContent) {
        return '<div style="display: none;" id="loading-file-1B87E">' . $haveLoadingFileContent . '</div>';
    }

    return '';
}

function modifyOutputLayoutForError($contentToAdd)
{
    $errorFile = APP_PATH . '/error.php';
    $errorFileExists = file_exists($errorFile);

    if ($_ENV['SHOW_ERRORS'] === "false") {
        if ($errorFileExists) {
            if (isAjaxOrXFileRequestOrRouteFile()) {
                $contentToAdd = "An error occurred";
            } else {
                $contentToAdd = "<div class='error'>An error occurred</div>";
            }
        } else {
            exit; // Exit if SHOW_ERRORS is false and no error file exists
        }
    }

    if ($errorFileExists) {

        $errorContent = $contentToAdd;

        if (isAjaxOrXFileRequestOrRouteFile()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => $errorContent
            ]);
            http_response_code(403);
        } else {
            $layoutFile = APP_PATH . '/layout.php';
            if (file_exists($layoutFile)) {

                ob_start();
                require_once $errorFile;
                MainLayout::$children = ob_get_clean();
                require_once $layoutFile;
            } else {
                echo $errorContent;
            }
        }
    } else {
        if (isAjaxOrXFileRequestOrRouteFile()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => $contentToAdd
            ]);
            http_response_code(403);
        } else {
            echo $contentToAdd;
        }
    }
    exit;
}

function createUpdateRequestData()
{
    $requestJsonData = SETTINGS_PATH . '/request-data.json';

    // Check if the JSON file exists
    if (file_exists($requestJsonData)) {
        // Read the current data from the JSON file
        $currentData = json_decode(file_get_contents($requestJsonData), true);
    } else {
        // If the file doesn't exist, initialize an empty array
        $currentData = [];
    }

    // Get the list of included/required files
    $includedFiles = get_included_files();

    // Filter only the files inside the src/app directory
    $srcAppFiles = [];
    foreach ($includedFiles as $filename) {
        if (strpos($filename, DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR) !== false) {
            $srcAppFiles[] = $filename;
        }
    }

    // Extract the current request URL
    $currentUrl = Request::$uri;

    // If the URL already exists in the data, merge new included files with the existing ones
    if (isset($currentData[$currentUrl])) {
        // Merge the existing and new included files, removing duplicates
        $currentData[$currentUrl]['includedFiles'] = array_unique(
            array_merge($currentData[$currentUrl]['includedFiles'], $srcAppFiles)
        );
    } else {
        // If the URL doesn't exist, add a new entry
        $currentData[$currentUrl] = [
            'url' => $currentUrl,
            'includedFiles' => $srcAppFiles,
        ];
    }

    // Convert the array back to JSON and save it to the file
    $jsonData = json_encode($currentData, JSON_PRETTY_PRINT);
    file_put_contents($requestJsonData, $jsonData);
}

function authenticateUserToken()
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

function isAjaxOrXFileRequestOrRouteFile(): bool
{
    if (Request::$fileToInclude === 'index.php') {
        return false;
    }

    return Request::$isAjax || Request::$isXFileRequest || Request::$fileToInclude === 'route.php';
}

set_exception_handler(function ($exception) {
    if (isAjaxOrXFileRequestOrRouteFile()) {
        $errorContent = "Exception: " . $exception->getMessage();
    } else {
        $errorContent = "<div class='error'>Exception: " . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    }
    modifyOutputLayoutForError($errorContent);
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR])) {

        if (isAjaxOrXFileRequestOrRouteFile()) {
            $errorContent = "Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line'];
        } else {
            $errorContent = "<div class='error'>Fatal Error: " . htmlspecialchars($error['message'], ENT_QUOTES, 'UTF-8') .
                " in " . htmlspecialchars($error['file'], ENT_QUOTES, 'UTF-8') .
                " on line " . $error['line'] . "</div>";
        }
        modifyOutputLayoutForError($errorContent);
    }
});

spl_autoload_register(function ($class) {
    // Path to the log file
    $logFile = SETTINGS_PATH . '/class-log.json';

    // Check if the file exists
    if (!file_exists($logFile)) {
        // Create an empty JSON file
        file_put_contents($logFile, json_encode([]));
    }

    // Read the current log data
    $logData = json_decode(file_get_contents($logFile), true) ?? [];

    // Attempt to load the class file and get the file path
    $classParts = explode('\\', $class);
    $filePath = __DIR__ . '/src/' . implode('/', $classParts) . '.php';

    // Require the file if it exists
    if (file_exists($filePath)) {
        require_once $filePath;

        // After loading the file, check all declared classes
        $declaredClasses = get_declared_classes();
        foreach ($declaredClasses as $declaredClass) {
            $reflectionClass = new ReflectionClass($declaredClass);

            // Ensure the class is in the same namespace as the loaded class
            $classNamespace = implode('\\', $classParts);
            if (strpos($declaredClass, $classNamespace) === 0) {
                // Check if the class implements IPHPX
                if ($reflectionClass->implementsInterface(IPHPX::class)) {
                    $logData[$declaredClass] = [
                        'class_name' => $declaredClass,
                        'file_path' => $filePath,
                    ];
                }
            }
        }
    }

    // Save back to the JSON file
    file_put_contents($logFile, json_encode($logData, JSON_PRETTY_PRINT));
}, true, true);

try {
    $_determineContentToInclude = determineContentToInclude();
    $_contentToInclude = $_determineContentToInclude['path'] ?? '';
    $_layoutsToInclude = $_determineContentToInclude['layouts'] ?? [];
    Request::$pathname = $_determineContentToInclude['pathname'] ? '/' . $_determineContentToInclude['pathname'] : '/';
    Request::$uri = $_determineContentToInclude['uri'] ? $_determineContentToInclude['uri'] : '/';
    if (is_file($_contentToInclude)) {
        Request::$fileToInclude = basename($_contentToInclude); // returns the file name
    }

    checkForDuplicateRoutes();
    authenticateUserToken();

    if (empty($_contentToInclude)) {
        if (!Request::$isXFileRequest && PrismaPHPSettings::$option->backendOnly) {
            // Set the header and output a JSON response for permission denied
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Permission denied'
            ]);
            http_response_code(403); // Set HTTP status code to 403 Forbidden
            exit;
        }

        $_requestFilePath = APP_PATH . Request::$pathname;
        if (is_file($_requestFilePath)) {
            if (file_exists($_requestFilePath) && Request::$isXFileRequest) {
                // Check if the file is a PHP file
                if (pathinfo($_requestFilePath, PATHINFO_EXTENSION) === 'php') {
                    // Include the PHP file without setting the JSON header
                    include $_requestFilePath;
                } else {
                    // Set the appropriate content-type for non-PHP files if needed
                    // and read the content
                    header('Content-Type: ' . mime_content_type($_requestFilePath)); // Dynamic content type
                    readfile($_requestFilePath);
                }
                exit;
            }
        } else if (PrismaPHPSettings::$option->backendOnly) {
            // Set the header and output a JSON response for file not found
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Not found'
            ]);
            http_response_code(404); // Set HTTP status code to 404 Not Found
            exit;
        }
    }

    if (!empty($_contentToInclude) && Request::$fileToInclude === 'route.php') {
        header('Content-Type: application/json');
        require_once $_contentToInclude;
        exit;
    }

    $_parentLayoutPath = APP_PATH . '/layout.php';
    $_isParentLayout = !empty($_layoutsToInclude) && strpos($_layoutsToInclude[0], 'src/app/layout.php') !== false;

    $_isContentIncluded = false;
    $_isChildContentIncluded = false;
    $_isContentVariableIncluded = containsChildren($_parentLayoutPath);
    if (!$_isContentVariableIncluded) {
        $_isContentIncluded = true;
    }

    if (!empty($_contentToInclude) && !empty(Request::$fileToInclude)) {
        if (!$_isParentLayout) {
            ob_start();
            require_once $_contentToInclude;
            MainLayout::$childLayoutChildren = ob_get_clean();
        }
        foreach (array_reverse($_layoutsToInclude) as $layoutPath) {
            if ($_parentLayoutPath === $layoutPath) {
                continue;
            }

            $_isChildContentVariableIncluded = containsChildLayoutChildren($layoutPath);
            if (!$_isChildContentVariableIncluded) {
                $_isChildContentIncluded = true;
            }

            ob_start();
            require_once $layoutPath;
            MainLayout::$childLayoutChildren = ob_get_clean();
        }
    } else {
        ob_start();
        require_once APP_PATH . '/not-found.php';
        MainLayout::$childLayoutChildren = ob_get_clean();
    }

    if ($_isParentLayout && !empty($_contentToInclude)) {
        ob_start();
        require_once $_contentToInclude;
        MainLayout::$childLayoutChildren = ob_get_clean();
    }

    if (!$_isContentIncluded && !$_isChildContentIncluded) {
        $_secondRequestC69CD = Request::$data['secondRequestC69CD'] ?? false;

        if (!$_secondRequestC69CD) {
            createUpdateRequestData();
        }

        if (Request::$isWire && !$_secondRequestC69CD) {
            $_requestFilesJson = SETTINGS_PATH . '/request-data.json';
            $_requestFilesData = file_exists($_requestFilesJson) ? json_decode(file_get_contents($_requestFilesJson), true) : [];

            if ($_requestFilesData[Request::$uri]) {
                $_requestDataToLoop = $_requestFilesData[Request::$uri];

                foreach ($_requestDataToLoop['includedFiles'] as $file) {
                    if (file_exists($file)) {
                        ob_start();
                        require_once $file;
                        MainLayout::$childLayoutChildren .= ob_get_clean();
                    }
                }
            }
        }

        MainLayout::$children = MainLayout::$childLayoutChildren;
        MainLayout::$children .= getLoadingsFiles();
        MainLayout::$children = TemplateCompiler::compile(MainLayout::$children);

        ob_start();
        require_once APP_PATH . '/layout.php';

        if (Request::$isWire && !$_secondRequestC69CD) {
            ob_end_clean();
            wireCallback();
        } else {
            echo ob_get_clean();
        }
    } else {
        if ($_isContentIncluded) {
            if (isAjaxOrXFileRequestOrRouteFile()) {
                $_errorDetails = "The layout file does not contain &lt;?php echo MainLayout::\$childLayoutChildren; ?&gt; or &lt;?= MainLayout::\$childLayoutChildren ?&gt;<br><strong>$layoutPath</strong>";
            } else {
                $_errorDetails = "<div class='error'>The parent layout file does not contain &lt;?php echo MainLayout::\$children; ?&gt; Or &lt;?= MainLayout::\$children ?&gt;<br>" . "<strong>$_parentLayoutPath</strong></div>";
            }
            modifyOutputLayoutForError($_errorDetails);
        } else {
            if (isAjaxOrXFileRequestOrRouteFile()) {
                $_errorDetails = "The layout file does not contain &lt;?php echo MainLayout::\$childLayoutChildren; ?&gt; or &lt;?= MainLayout::\$childLayoutChildren ?&gt;<br><strong>$layoutPath</strong>";
            } else {
                $_errorDetails = "<div class='error'>The layout file does not contain &lt;?php echo MainLayout::\$childLayoutChildren; ?&gt; or &lt;?= MainLayout::\$childLayoutChildren ?&gt;<br><strong>$layoutPath</strong></div>";
            }
            modifyOutputLayoutForError($_errorDetails);
        }
    }
} catch (Throwable $e) {
    if (isAjaxOrXFileRequestOrRouteFile()) {
        $_errorDetails = "Unhandled Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine();
    } else {
        $_errorDetails = "Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
        $_errorDetails .= "<br>File: " . htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8');
        $_errorDetails .= "<br>Line: " . htmlspecialchars($e->getLine(), ENT_QUOTES, 'UTF-8');
        $_errorDetails = "<div class='error'>$_errorDetails</div>";
    }
    modifyOutputLayoutForError($_errorDetails);
}

(function () {
    $lastErrorCapture = error_get_last();
    if ($lastErrorCapture !== null) {

        if (isAjaxOrXFileRequestOrRouteFile()) {
            $errorContent = "Error: " . $lastErrorCapture['message'] . " in " . $lastErrorCapture['file'] . " on line " . $lastErrorCapture['line'];
        } else {
            $errorContent = "<div class='error'>Error: " . $lastErrorCapture['message'] . " in " . $lastErrorCapture['file'] . " on line " . $lastErrorCapture['line'] . "</div>";
        }
        modifyOutputLayoutForError($errorContent);
    }
})();

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        // This error code is not included in error_reporting
        return;
    }

    // Capture the specific severity types, including warnings (E_WARNING)
    if (isAjaxOrXFileRequestOrRouteFile()) {
        $errorContent = "Error: {$severity} - {$message} in {$file} on line {$line}";
    } else {
        $errorContent = "<div class='error'>Error: {$message} in {$file} on line {$line}</div>";
    }

    // If needed, log it or output immediately based on severity
    if ($severity === E_WARNING || $severity === E_NOTICE) {
        modifyOutputLayoutForError($errorContent);
    }
});
