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
    $scriptUrl = $_SERVER['REQUEST_URI'];
    $scriptUrl = explode('?', $scriptUrl, 2)[0];
    $uri = $_SERVER['SCRIPT_URL'] ?? uriExtractor($scriptUrl);
    $uri = ltrim($uri, '/');
    $baseDir = APP_PATH;
    $includePath = '';
    $layoutsToInclude = [];
    writeRoutes();
    AuthMiddleware::handle($uri);

    $isDirectAccessToPrivateRoute = preg_match('/\/_/', $uri);
    if ($isDirectAccessToPrivateRoute) {
        $sameSiteFetch = false;
        $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
        if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
            $sameSiteFetch = true;
        }

        if (!$sameSiteFetch) {
            return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri];
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

    return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri];
}

function getFilePrecedence()
{
    global $_filesListRoutes;

    // Normalize the file paths for consistent comparison
    $_filesListRoutes = array_map(function ($route) {
        return str_replace('\\', '/', $route);
    }, $_filesListRoutes);

    // Look for route.php in the /src/app/ directory
    $routeFile = array_filter($_filesListRoutes, function ($route) {
        return preg_match('/^\.\/src\/app\/route\.php$/', $route);
    });

    // If route.php is found, return just the file name
    if (!empty($routeFile)) {
        return '/route.php';
    }

    // If route.php is not found, look for index.php in the /src/app/ directory
    $indexFile = array_filter($_filesListRoutes, function ($route) {
        return preg_match('/^\.\/src\/app\/index\.php$/', $route);
    });

    // If index.php is found, return just the file name
    if (!empty($indexFile)) {
        return '/index.php';
    }

    // If neither file is found, return null or handle the case as needed
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
    $pattern = "/(?:.*$escapedIdentifier)(\/.*)$/";
    if (preg_match($pattern, $scriptUrl, $matches)) {
        if (!empty($matches[1])) {
            $leftTrim = ltrim($matches[1], '/');
            $rightTrim = rtrim($leftTrim, '/');
            return "$rightTrim";
        }
    }

    return "/";
}

function writeRoutes()
{
    global $_filesListRoutes;
    $directory = './src/app';

    if (is_dir($directory)) {
        $filesList = [];

        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $filesList[] = $file->getPathname();
            }
        }

        $jsonData = json_encode($filesList, JSON_PRETTY_PRINT);
        $jsonFileName = SETTINGS_PATH . '/files-list.json';
        file_put_contents($jsonFileName, $jsonData);

        if (file_exists($jsonFileName)) {
            $_filesListRoutes = json_decode(file_get_contents($jsonFileName), true);
        }
    }
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
        $routeSegments = explode('/', ltrim($normalizedRoute, '/'));
        $singleDynamic = preg_match_all('/\[[^\]]+\]/', $normalizedRoute, $matches) === 1 && !strpos($normalizedRoute, '[...');
        if ($singleDynamic) {
            $segmentMatch = singleDynamicRoute($uriSegments, $routeSegments);
            if (!empty($segmentMatch)) {
                $trimSegmentMatch = trim($segmentMatch, '[]');
                $dynamicRouteParams = new \ArrayObject([$trimSegmentMatch => $uriSegments[array_search($segmentMatch, $routeSegments)]], \ArrayObject::ARRAY_AS_PROPS);

                $dynamicRouteUri = str_replace($segmentMatch, $uriSegments[array_search($segmentMatch, $routeSegments)], $normalizedRoute);
                $dynamicRouteUriDirname = dirname($dynamicRouteUri);
                $dynamicRouteUriDirname = rtrim($dynamicRouteUriDirname, '/');

                $expectedUri = '/src/app/' . $normalizedUri;
                $expectedUri = rtrim($expectedUri, '/');

                if (strpos($normalizedRoute, 'route.php') !== false || strpos($normalizedRoute, 'index.php') !== false) {
                    if ($expectedUri === $dynamicRouteUriDirname) {
                        $uriMatch = $normalizedRoute;
                        break;
                    }
                }
            }
        } elseif (strpos($normalizedRoute, '[...') !== false) {
            $cleanedRoute = preg_replace('/\[\.\.\..*?\].*/', '', $normalizedRoute);
            if (strpos('/src/app/' . $normalizedUri, $cleanedRoute) === 0) {

                $normalizedUriEdited = "/src/app/$normalizedUri";
                $trimNormalizedUriEdited = str_replace($cleanedRoute, '', $normalizedUriEdited);
                $explodedNormalizedUri = explode('/', $trimNormalizedUriEdited);
                $pattern = '/\[\.\.\.(.*?)\]/';
                if (preg_match($pattern, $normalizedRoute, $matches)) {
                    $contentWithinBrackets = $matches[1];
                    $dynamicRouteParams = new \ArrayObject([$contentWithinBrackets => $explodedNormalizedUri], \ArrayObject::ARRAY_AS_PROPS);
                }
                if (strpos($normalizedRoute, 'route.php') !== false) {
                    $uriMatch = $normalizedRoute;
                    break;
                } else {
                    if (strpos($normalizedRoute, 'index.php') !== false) {
                        $segmentMatch = "[...$contentWithinBrackets]";
                        $dynamicRouteUri = str_replace($segmentMatch, $uriSegments[array_search($segmentMatch, $routeSegments)], $normalizedRoute);
                        $dynamicRouteUriDirname = dirname($dynamicRouteUri);
                        $dynamicRouteUriDirname = rtrim($dynamicRouteUriDirname, '/');

                        $expectedUri = '/src/app/' . $normalizedUri;
                        $expectedUri = rtrim($expectedUri, '/');

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
    global $_filesListRoutes;
    $normalizedRoutesMap = [];
    foreach ($_filesListRoutes as $route) {
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

function setupErrorHandling(&$content)
{
    set_error_handler(function ($severity, $message, $file, $line) use (&$content) {
        $content .= "<div class='error'>Error: {$severity} - {$message} in {$file} on line {$line}</div>";
    });

    set_exception_handler(function ($exception) use (&$content) {
        $content .= "<div class='error'>Exception: " . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    });

    register_shutdown_function(function () use (&$content) {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR])) {
            $formattedError = "<div class='error'>Fatal Error: " . htmlspecialchars($error['message'], ENT_QUOTES, 'UTF-8') .
                " in " . htmlspecialchars($error['file'], ENT_QUOTES, 'UTF-8') .
                " on line " . $error['line'] . "</div>";
            $content .= $formattedError;
            modifyOutputLayoutForError($content);
        }
    });
}


function containsChildContent($filePath)
{
    $fileContent = file_get_contents($filePath);
    if (
        (strpos($fileContent, 'echo $childContent') === false &&
            strpos($fileContent, 'echo $childContent;') === false) &&
        (strpos($fileContent, '<?= $childContent ?>') === false) &&
        (strpos($fileContent, '<?= $childContent; ?>') === false)
    ) {
        return true;
    } else {
        return false;
    }
}

function containsContent($filePath)
{
    $fileContent = file_get_contents($filePath);
    if (
        (strpos($fileContent, 'echo $content') === false &&
            strpos($fileContent, 'echo $content;') === false) &&
        (strpos($fileContent, '<?= $content ?>') === false) &&
        (strpos($fileContent, '<?= $content; ?>') === false)
    ) {
        return true;
    } else {
        return false;
    }
}

function modifyOutputLayoutForError($contentToAdd)
{
    if ($_ENV['SHOW_ERRORS'] === "false") exit;

    $layoutContent = file_get_contents(APP_PATH . '/layout.php');
    if ($layoutContent !== false) {
        $newBodyContent = "<body class=\"fatal-error\">$contentToAdd</body>";

        $modifiedNotFoundContent = preg_replace('~<body.*?>.*?</body>~s', $newBodyContent, $layoutContent);

        echo $modifiedNotFoundContent;
        exit;
    }
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

ob_start();
require_once SETTINGS_PATH . '/public-functions.php';
require_once SETTINGS_PATH . '/request-methods.php';
$_metadataFile = APP_PATH . '/metadata.php';
$_metadataArray = file_exists($_metadataFile) ? require_once $_metadataFile : [];
$_filesListRoutes = [];
$_prismaPHPSettings = getPrismaSettings();
$_fileToInclude = '';

/**
 * @var array $metadata Metadata information
 */
$metadata = [];
/**
 * @var string $uri The URI of the current request
 */
$uri = "";
/**
 * @var string $pathname The pathname of the current request
 */
$pathname = "";
/**
 * @var array $dynamicRouteParams The dynamic route parameters
 */
$dynamicRouteParams = [];
/**
 * @var string $content The content to be included in the main layout file
 */
$content = "";
/**
 * @var string $childContent The child content to be included in the layout file
 */
$childContent = "";
/**
 * @var array $mainLayoutHead The head content to be included in the main layout file
 */
$mainLayoutHead = [];
/**
 * @var array $mainLayoutFooter The footer content to be included in the main layout file
 */
$mainLayoutFooter = [];

try {
    $_determineContentToInclude = determineContentToInclude();
    checkForDuplicateRoutes();
    $_contentToInclude = $_determineContentToInclude['path'] ?? '';
    $_layoutsToInclude = $_determineContentToInclude['layouts'] ?? [];
    $uri = $_determineContentToInclude['uri'] ?? '';
    $pathname = $uri ? "/" . $uri : "/";
    $_fileToInclude = basename($_contentToInclude);

    authenticateUserToken();

    if (empty($_contentToInclude)) {
        if (!$isXFilRequest) {
            // Set the header and output a JSON response for permission denied
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Permission denied'
            ]);
            http_response_code(403); // Set HTTP status code to 403 Forbidden
            exit;
        }

        $filePath = APP_PATH . '/' . $uri;
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
        } else {
            // Set the header and output a JSON response for file not found
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Not found'
            ]);
            http_response_code(404); // Set HTTP status code to 404 Not Found
        }
        exit;
    }

    if (!empty($_contentToInclude) && basename($_contentToInclude) === 'route.php') {
        header('Content-Type: application/json');
        require_once $_contentToInclude;
        exit;
    }

    $metadata = $_metadataArray[$uri] ?? ($_metadataArray['default'] ?? []);
    $_parentLayoutPath = APP_PATH . '/layout.php';
    $_isParentLayout = !empty($_layoutsToInclude) && strpos($_layoutsToInclude[0], 'src/app/layout.php') !== false;

    $_isContentIncluded = false;
    $_isChildContentIncluded = false;
    if (containsContent($_parentLayoutPath)) {
        $_isContentIncluded = true;
    }

    ob_start();
    if (!empty($_contentToInclude)) {
        if (!$_isParentLayout) {
            ob_start();
            require_once $_contentToInclude;
            $childContent = ob_get_clean();
        }
        foreach (array_reverse($_layoutsToInclude) as $layoutPath) {
            if ($_parentLayoutPath === $layoutPath) {
                continue;
            }

            if (containsChildContent($layoutPath)) {
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
        $content .= $childContent;
        $content .= getLoadingsFiles();

        ob_start();
        require_once APP_PATH . '/layout.php';

        if ($isWire && !isset($_data53C84['secondRequestC69CD'])) {
            ob_end_clean();
            wireCallback();
        }
    } else {
        if ($_isContentIncluded) {
            $content .= "<div class='error'>The parent layout file does not contain &lt;?php echo \$content; ?&gt; Or &lt;?= \$content ?&gt;<br>" . "<strong>$_parentLayoutPath</strong></div>";
            modifyOutputLayoutForError($content);
        } else {
            $content .= "<div class='error'>The layout file does not contain &lt;?php echo \$childContent; ?&gt; or &lt;?= \$childContent ?&gt;<br><strong>$layoutPath</strong></div>";
            modifyOutputLayoutForError($content);
        }
    }
} catch (Throwable $e) {
    $content = ob_get_clean();
    $errorDetails = "Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
    $errorDetails .= "<br>File: " . htmlspecialchars($e->getFile(), ENT_QUOTES, 'UTF-8');
    $errorDetails .= "<br>Line: " . htmlspecialchars($e->getLine(), ENT_QUOTES, 'UTF-8');
    $content .= "<div class='error'>" . $errorDetails . "</div>";
    modifyOutputLayoutForError($content);
}
