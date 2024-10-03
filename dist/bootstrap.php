<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/settings/paths.php';

use Lib\Middleware\AuthMiddleware;
use Lib\Auth\Auth;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(\DOCUMENT_PATH);
$dotenv->load();

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
    $requestUri = empty($_SERVER['SCRIPT_URL']) ? uriExtractor($requestUri) : $requestUri;
    /** 
     * ============ URI Path Handling ============ 
     * The $uri variable now contains the URI path without query parameters and without the leading slash. 
     * Examples: 
     * - Home page: '' (empty string) 
     * - Dynamic routes (e.g., '/dashboard?v=2' or '/profile?id=5') -> Only the path part is returned (e.g., 'dashboard' or 'profile'), without the query parameters. 
     * ============================================
     */
    $scriptUrl = explode('?', $requestUri, 2)[0];
    $uri = $_SERVER['SCRIPT_URL'] ?? $scriptUrl;
    $uri = ltrim($uri, '/');
    $baseDir = APP_PATH;
    $includePath = '';
    $layoutsToInclude = [];

    /** 
     * ============ Middleware Management ============
     * AuthMiddleware is invoked to handle authentication logic for the current route ($uri).
     * ================================================
     */
    AuthMiddleware::handle($uri);
    /** 
     * ============ End of Middleware Management ======
     * ================================================
     */

    $isDirectAccessToPrivateRoute = preg_match('/_/', $uri);
    if ($isDirectAccessToPrivateRoute) {
        $sameSiteFetch = false;
        $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
        if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
            $sameSiteFetch = true;
        }

        if (!$sameSiteFetch) {
            return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri, 'requestUri' => $requestUri];
        }
    }

    if ($uri) {
        $groupFolder = findGroupFolder($uri);
        if ($groupFolder) {
            $path = __DIR__ . $groupFolder;
            if (file_exists($path)) {
                $includePath = $path;
            }
        }

        if (empty($includePath)) {
            $dynamicRoute = dynamicRoute($uri);
            if ($dynamicRoute) {
                $path = __DIR__ . $dynamicRoute;
                if (file_exists($path)) {
                    $includePath = $path;
                }
            }
        }

        $currentPath = $baseDir;
        $getGroupFolder = getGroupFolder($groupFolder);
        $modifiedUri = $uri;
        if (!empty($getGroupFolder)) {
            $modifiedUri = trim($getGroupFolder, "/src/app/");
        }

        foreach (explode('/', $modifiedUri) as $segment) {
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

    return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri, 'requestUri' => $requestUri];
}

function getFilePrecedence()
{
    global $_filesListRoutes;

    foreach ($_filesListRoutes as $route) {
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
    global $_prismaPHPSettings;

    $projectName = $_prismaPHPSettings['projectName'] ?? '';
    if (empty($projectName)) {
        return "/";
    }

    $escapedIdentifier = preg_quote($projectName, '/');
    if (preg_match("/(?:.*$escapedIdentifier)(\/.*)$/", $scriptUrl, $matches) && !empty($matches[1])) {
        return rtrim(ltrim($matches[1], '/'), '/');
    }

    return "/";
}

function getFilesListRoutes()
{
    $jsonFileName = SETTINGS_PATH . '/files-list.json';
    $routeFiles = file_exists($jsonFileName) ? json_decode(file_get_contents($jsonFileName), true) : [];

    return $routeFiles;
}

function findGroupFolder($uri): string
{
    $uriSegments = explode('/', $uri);
    foreach ($uriSegments as $segment) {
        if (!empty($segment)) {
            if (isGroupIdentifier($segment)) {
                return $segment;
            }
        }
    }

    $matchedGroupFolder = matchGroupFolder($uri);
    if ($matchedGroupFolder) {
        return $matchedGroupFolder;
    } else {
        return '';
    }
}

function dynamicRoute($uri)
{
    global $_filesListRoutes, $dynamicRouteParams;

    $uriMatch = null;
    $normalizedUri = ltrim(str_replace('\\', '/', $uri), './');
    $normalizedUriEdited = "src/app/$normalizedUri";
    $uriSegments = explode('/', $normalizedUriEdited);

    foreach ($_filesListRoutes as $route) {
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
            $segmentMatch = singleDynamicRoute($uriSegments, $filteredRouteSegments);
            $index = array_search($segmentMatch, $filteredRouteSegments);

            if ($index !== false && isset($uriSegments[$index])) {
                $trimSegmentMatch = trim($segmentMatch, '[]');
                $dynamicRouteParams = new \ArrayObject([$trimSegmentMatch => $uriSegments[$index]], \ArrayObject::ARRAY_AS_PROPS);

                $dynamicRouteUri = str_replace($segmentMatch, $uriSegments[$index], $normalizedRoute);
                $dynamicRouteUri = preg_replace('/\(.+\)/', '', $dynamicRouteUri);
                $dynamicRouteUri = preg_replace('/\/+/', '/', $dynamicRouteUri);
                $dynamicRouteUriDirname = rtrim(dirname($dynamicRouteUri), '/');

                $expectedUri = rtrim('/src/app/' . $normalizedUri, '/');

                if (strpos($normalizedRoute, 'route.php') !== false || strpos($normalizedRoute, 'index.php') !== false) {
                    if ($expectedUri === $dynamicRouteUriDirname) {
                        $uriMatch = $normalizedRoute;
                        break;
                    }
                }
            }
        } elseif (strpos($normalizedRoute, '[...') !== false) {
            // Clean and normalize the route
            $cleanedNormalizedRoute = preg_replace('/\(.+\)/', '', $normalizedRoute);
            $cleanedNormalizedRoute = preg_replace('/\/+/', '/', $cleanedNormalizedRoute);
            $dynamicSegmentRoute = preg_replace('/\[\.\.\..*?\].*/', '', $cleanedNormalizedRoute);

            // Check if the normalized URI starts with the cleaned route
            if (strpos("/src/app/$normalizedUri", $dynamicSegmentRoute) === 0) {
                $trimmedUri = str_replace($dynamicSegmentRoute, '', "/src/app/$normalizedUri");
                $uriParts = explode('/', trim($trimmedUri, '/'));

                // Extract the dynamic segment content
                if (preg_match('/\[\.\.\.(.*?)\]/', $normalizedRoute, $matches)) {
                    $dynamicParam = $matches[1];
                    $dynamicRouteParams = new \ArrayObject([$dynamicParam => $uriParts], \ArrayObject::ARRAY_AS_PROPS);
                }

                // Check for 'route.php'
                if (strpos($normalizedRoute, 'route.php') !== false) {
                    $uriMatch = $normalizedRoute;
                    break;
                }

                // Handle matching routes ending with 'index.php'
                if (strpos($normalizedRoute, 'index.php') !== false) {
                    $segmentMatch = "[...$dynamicParam]";
                    $index = array_search($segmentMatch, $filteredRouteSegments);

                    if ($index !== false && isset($uriSegments[$index])) {
                        // Generate the dynamic URI
                        $dynamicRouteUri = str_replace($segmentMatch, implode('/', $uriParts), $cleanedNormalizedRoute);
                        $dynamicRouteUriDirname = rtrim(dirname($dynamicRouteUri), '/');

                        $expectedUri = rtrim("/src/app/$normalizedUri", '/');

                        // Compare the expected and dynamic URIs
                        if ($expectedUri === $dynamicRouteUriDirname) {
                            $uriMatch = $normalizedRoute;
                            break;
                        }
                    }
                }
            }
        }
    }

    return $uriMatch;
}

function isGroupIdentifier($segment): bool
{
    return preg_match('/^\(.*\)$/', $segment);
}

function matchGroupFolder($constructedPath): ?string
{
    global $_filesListRoutes;

    $bestMatch = null;
    $normalizedConstructedPath = ltrim(str_replace('\\', '/', $constructedPath), './');

    $routeFile = "/src/app/$normalizedConstructedPath/route.php";
    $indexFile = "/src/app/$normalizedConstructedPath/index.php";

    foreach ($_filesListRoutes as $route) {
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

function getGroupFolder($uri): string
{
    $lastSlashPos = strrpos($uri, '/');
    $pathWithoutFile = substr($uri, 0, $lastSlashPos);

    if (preg_match('/\(([^)]+)\)[^()]*$/', $pathWithoutFile, $matches)) {
        return $pathWithoutFile;
    }

    return "";
}

function singleDynamicRoute($uriSegments, $routeSegments)
{
    $segmentMatch = "";
    foreach ($routeSegments as $index => $segment) {
        if (preg_match('/^\[[^\]]+\]$/', $segment)) {
            return "{$segment}";
        } else {
            if ($segment !== $uriSegments[$index]) {
                return $segmentMatch;
            }
        }
    }
    return $segmentMatch;
}

function checkForDuplicateRoutes()
{
    if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production') return;

    global $_filesListRoutes;
    $normalizedRoutesMap = [];
    foreach ($_filesListRoutes as $route) {
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
        $errorMessageString = implode("<br>", $errorMessages);
        modifyOutputLayoutForError($errorMessageString);
    }
}

function containsChildContent($filePath)
{
    $fileContent = file_get_contents($filePath);

    // Regular expression to match different ways of echoing $childContent
    $pattern = '/\<\?=\s*\$childContent\s*;?\s*\?>|echo\s*\$childContent\s*;?/';

    // Return true if $childContent variables are found, false otherwise
    return preg_match($pattern, $fileContent) === 1;
}

function containsContent($filePath)
{
    $fileContent = file_get_contents($filePath);

    // Improved regular expression to match different ways of echoing $content
    $pattern = '/\<\?=\s*\$content\s*;?\s*\?>|echo\s*\$content\s*;?/';

    // Return true if content variables are found, false otherwise
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
    global $_filesListRoutes, $uri, $pathname, $dynamicRouteParams, $params, $referer;

    $loadingFiles = array_filter($_filesListRoutes, function ($route) {
        $normalizedRoute = str_replace('\\', '/', $route);
        return preg_match('/\/loading\.php$/', $normalizedRoute);
    });

    $haveLoadingFileContent = array_reduce($loadingFiles, function ($carry, $route) use ($uri, $pathname, $dynamicRouteParams, $params, $referer) {
        $normalizeUri = str_replace('\\', '/', $route);
        $fileUrl = str_replace('./src/app', '', $normalizeUri);
        $route = str_replace(['\\', './'], ['/', ''], $route);

        ob_start();
        include($route); // This will execute the PHP code in loading.php
        $content = ob_get_clean();

        if ($content !== false) {
            $url = $fileUrl === '/loading.php' ? '/' : str_replace('/loading.php', '', $fileUrl);
            $carry .= '<div pp-loading-url="' . $url . '">' . $content . '</div>';
        }

        return $carry;
    }, '');

    if ($haveLoadingFileContent) {
        return '<div style="display: none;" id="loading-file-1B87E">' . $haveLoadingFileContent . '</div>';
    }

    return '';
}

function getPrismaSettings(): \ArrayObject
{
    $_prismaPHPSettingsFile = DOCUMENT_PATH . '/prisma-php.json';

    if (file_exists($_prismaPHPSettingsFile)) {
        $jsonContent = file_get_contents($_prismaPHPSettingsFile);
        $decodedJson = json_decode($jsonContent, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            return new \ArrayObject($decodedJson, \ArrayObject::ARRAY_AS_PROPS);
        } else {
            return new \ArrayObject([]);
        }
    }
}

function modifyOutputLayoutForError($contentToAdd)
{
    global
        $baseUrl,
        $metadata,
        $content,
        $childContent,
        $uri,
        $pathname,
        $dynamicRouteParams,
        $params,
        $referer,
        $mainLayoutHead,
        $mainLayoutFooter;

    $errorFile = APP_PATH . '/error.php';
    $errorFileExists = file_exists($errorFile);

    if ($_ENV['SHOW_ERRORS'] === "false") {
        if ($errorFileExists) {
            $contentToAdd = "<div class='error'>An error occurred</div>";
        } else {
            exit; // Exit if SHOW_ERRORS is false and no error file exists
        }
    }

    if ($errorFileExists) {

        $errorContent = $contentToAdd;

        $layoutFile = APP_PATH . '/layout.php';
        if (file_exists($layoutFile)) {

            ob_start();
            include_once $errorFile;
            $content = ob_get_clean();
            include $layoutFile;
        } else {
            echo $errorContent;
        }
    } else {
        echo $contentToAdd;
    }
    exit;
}

function createUpdateRequestData()
{
    global $_requestUriForFilesIncludes;

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
    $currentUrl = $_requestUriForFilesIncludes;

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

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        // This error code is not included in error_reporting
        return;
    }

    // Capture the specific severity types, including warnings (E_WARNING)
    $errorContent = "<div class='error'>Error: {$severity} - {$message} in {$file} on line {$line}</div>";

    // If needed, log it or output immediately based on severity
    if ($severity === E_WARNING || $severity === E_NOTICE) {
        modifyOutputLayoutForError($errorContent);
    }
});

set_exception_handler(function ($exception) {
    $errorContent = "<div class='error'>Exception: " . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    modifyOutputLayoutForError($errorContent);
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR])) {
        $formattedError = "<div class='error'>Fatal Error: " . htmlspecialchars($error['message'], ENT_QUOTES, 'UTF-8') .
            " in " . htmlspecialchars($error['file'], ENT_QUOTES, 'UTF-8') .
            " on line " . $error['line'] . "</div>";
        $errorContent = $formattedError;
        modifyOutputLayoutForError($errorContent);
    }
});

$_prismaPHPSettings = getPrismaSettings();
$_filesListRoutes = getFilesListRoutes();

require_once SETTINGS_PATH . '/public-functions.php';
require_once SETTINGS_PATH . '/request-methods.php';
$_metadataFile = APP_PATH . '/metadata.php';
$_metadataArray = file_exists($_metadataFile) ? require_once $_metadataFile : [];
$_fileToInclude = '';

function authenticateUserToken()
{
    $token = getBearerToken();
    if ($token) {
        $auth = Auth::getInstance();
        $verifyToken = $auth->verifyToken($token);
        if ($verifyToken) {
            $auth->authenticate($verifyToken);
        }
    }
}

/**
 * @var array $metadata Metadata information
 */
$metadata = [];
/**
 * @var string $pathname The pathname of the current request
 */
$pathname = '';
/**
 * @var array $dynamicRouteParams The dynamic route parameters
 */
$dynamicRouteParams = [];
/**
 * @var string $content The content to be included in the main layout file
 */
$content = '';
/**
 * @var string $childContent The child content to be included in the layout file
 */
$childContent = '';
/**
 * @var array $mainLayoutHead The head content to be included in the main layout file
 */
$mainLayoutHead = [];
/**
 * @var array $mainLayoutFooter The footer content to be included in the main layout file
 */
$mainLayoutFooter = [];
/**
 * @var string $requestUrl - The request URL.
 */
$requestUri = '';

try {
    $_determineContentToInclude = determineContentToInclude();
    $_contentToInclude = $_determineContentToInclude['path'] ?? '';
    $_layoutsToInclude = $_determineContentToInclude['layouts'] ?? [];
    $pathname = $_determineContentToInclude['uri'] ? '/' . $_determineContentToInclude['uri'] : '/';
    $requestUri = $_determineContentToInclude['requestUri'] ? $_determineContentToInclude['requestUri'] : '/';
    $_requestUriForFilesIncludes = $requestUri;
    $_fileToInclude = null;
    if (is_file($_contentToInclude)) {
        $_fileToInclude = basename($_contentToInclude); // returns the file name
    }
    $metadata = $_metadataArray[$pathname] ?? ($_metadataArray['default'] ?? []);

    checkForDuplicateRoutes();
    authenticateUserToken();

    if (empty($_contentToInclude)) {
        if (!$isXFilRequest && $_prismaPHPSettings['backendOnly']) {
            // Set the header and output a JSON response for permission denied
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Permission denied'
            ]);
            http_response_code(403); // Set HTTP status code to 403 Forbidden
            exit;
        }

        $filePath = APP_PATH . $pathname;
        if (is_file($filePath)) {
            if (file_exists($filePath)) {
                // Check if the file is a PHP file
                if (pathinfo($filePath, PATHINFO_EXTENSION) === 'php') {
                    // Include the PHP file without setting the JSON header
                    include $filePath;
                } else {
                    // Set the appropriate content-type for non-PHP files if needed
                    // and read the content
                    header('Content-Type: ' . mime_content_type($filePath)); // Dynamic content type
                    readfile($filePath);
                }
                exit;
            }
        } else if ($_prismaPHPSettings['backendOnly']) {
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

    if (!empty($_contentToInclude) && $_fileToInclude === 'route.php') {
        header('Content-Type: application/json');
        require_once $_contentToInclude;
        exit;
    }

    $_parentLayoutPath = APP_PATH . '/layout.php';
    $_isParentLayout = !empty($_layoutsToInclude) && strpos($_layoutsToInclude[0], 'src/app/layout.php') !== false;

    $_isContentIncluded = false;
    $_isChildContentIncluded = false;
    $_isContentVariableIncluded = containsContent($_parentLayoutPath);
    if (!$_isContentVariableIncluded) {
        $_isContentIncluded = true;
    }

    if (!empty($_contentToInclude) && !empty($_fileToInclude)) {
        if (!$_isParentLayout) {
            ob_start();
            require_once $_contentToInclude;
            $childContent = ob_get_clean();
        }
        foreach (array_reverse($_layoutsToInclude) as $layoutPath) {
            if ($_parentLayoutPath === $layoutPath) {
                continue;
            }

            $_isChildContentVariableIncluded = containsChildContent($layoutPath);
            if (!$_isChildContentVariableIncluded) {
                $_isChildContentIncluded = true;
            }

            ob_start();
            require_once $layoutPath;
            $childContent = ob_get_clean();
        }
    } else {
        ob_start();
        require_once APP_PATH . '/not-found.php';
        $childContent = ob_get_clean();
    }

    if ($_isParentLayout && !empty($_contentToInclude)) {
        ob_start();
        require_once $_contentToInclude;
        $childContent = ob_get_clean();
    }

    if (!$_isContentIncluded && !$_isChildContentIncluded) {
        $secondRequestC69CD = $_data53C84['secondRequestC69CD'] ?? false;

        if (!$secondRequestC69CD) {
            createUpdateRequestData();
        }

        if ($isWire && !$secondRequestC69CD) {
            $_requestFilesJson = SETTINGS_PATH . '/request-data.json';
            $_requestFilesData = file_exists($_requestFilesJson) ? json_decode(file_get_contents($_requestFilesJson), true) : [];

            if ($_requestFilesData[$_requestUriForFilesIncludes]) {
                $_requestDataToLoop = $_requestFilesData[$_requestUriForFilesIncludes];

                foreach ($_requestDataToLoop['includedFiles'] as $file) {
                    if (file_exists($file)) {
                        ob_start();
                        require_once $file;
                        $childContent .= ob_get_clean();
                    }
                }
            }
        }

        $content .= $childContent;
        $content .= getLoadingsFiles();

        if ($secondRequestC69CD) {
            echo $content;
            return;
        }

        ob_start();
        require_once APP_PATH . '/layout.php';

        if ($isWire && !$secondRequestC69CD) {
            ob_end_clean();
            wireCallback();
        } else {
            echo ob_get_clean();
        }
    } else {
        if ($_isContentIncluded) {
            echo "<div class='error'>The parent layout file does not contain &lt;?php echo \$content; ?&gt; Or &lt;?= \$content ?&gt;<br>" . "<strong>$_parentLayoutPath</strong></div>";
        } else {
            $errorDetails = "<div class='error'>The layout file does not contain &lt;?php echo \$childContent; ?&gt; or &lt;?= \$childContent ?&gt;<br><strong>$layoutPath</strong></div>";
            modifyOutputLayoutForError($errorDetails);
        }
    }
} catch (Throwable $e) {
    $errorDetails = "Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
    $errorDetails .= "<br>File: " . htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8');
    $errorDetails .= "<br>Line: " . htmlspecialchars($e->getLine(), ENT_QUOTES, 'UTF-8');
    $errorDetails = "<div class='error'>$errorDetails</div>";
    modifyOutputLayoutForError($errorDetails);
}
