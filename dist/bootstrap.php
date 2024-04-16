<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/settings/paths.php';
require_once __DIR__ . '/vendor/autoload.php';

use Lib\Middleware\AuthMiddleware;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(\DOCUMENT_PATH);
$dotenv->load();

function determineContentToInclude()
{
    $subject = $_SERVER["SCRIPT_NAME"];
    $dirname = dirname($subject);
    $requestUri = explode('?', $_SERVER['REQUEST_URI'], 2)[0];
    $requestUri = rtrim($requestUri, '/');
    $requestUri = str_replace($dirname, '', $requestUri);
    $uri = trim($requestUri, '/');
    $baseDir = APP_PATH;
    $includePath = '';
    $layoutsToInclude = [];
    writeRoutes();
    AuthMiddleware::handle($uri);

    $isDirectAccessToPrivateRoute = preg_match('/^_/', $uri);
    if ($isDirectAccessToPrivateRoute) {
        return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri];
    }

    if ($uri) {
        $groupFolder = findGroupFolder($uri);
        if ($groupFolder) {
            $path = __DIR__ . $groupFolder;
            if (file_exists($path)) {
                $includePath = $path;
            }
        }

        $currentPath = $baseDir;
        $getGroupFolder = getGroupFolder($groupFolder);
        $modifiedUri = $uri;
        if (!empty($getGroupFolder)) {
            $modifiedUri = trim($getGroupFolder, "/src/app/");
        }

        foreach (explode('/', $modifiedUri) as $segment) {
            if (empty($segment)) {
                continue;
            }
            $currentPath .= '/' . $segment;
            $potentialLayoutPath = $currentPath . '/layout.php';
            if (file_exists($potentialLayoutPath)) {
                $layoutsToInclude[] = $potentialLayoutPath;
            }
        }

        if (empty($layoutsToInclude)) {
            $layoutsToInclude[] = $baseDir . '/layout.php';
        }
    } else {
        $includePath = $baseDir . '/index.php';
    }

    return ['path' => $includePath, 'layouts' => $layoutsToInclude, 'uri' => $uri];
}

function checkForDuplicateRoutes()
{
    $routes = json_decode(file_get_contents(SETTINGS_PATH . "/files-list.json"), true);

    $normalizedRoutesMap = [];
    foreach ($routes as $route) {
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
            $directGroupMatchFound = false;
            foreach ($originalRoutes as $originalRoute) {
                if (preg_match('~^\\.\\/src\\/app[\\/\\\\]\\(.*?\\)[\\/\\\\].*?\\.php$~', $originalRoute, $matches)) {
                    $directGroupMatchFound = true;
                }
            }

            if ($directGroupMatchFound) continue;

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

function writeRoutes()
{
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
        @file_put_contents($jsonFileName, $jsonData);
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

function isGroupIdentifier($segment): bool
{
    return preg_match('/^\(.*\)$/', $segment);
}

function matchGroupFolder($constructedPath): ?string
{
    $routes = json_decode(file_get_contents(SETTINGS_PATH . "/files-list.json"), true);
    $bestMatch = null;
    $normalizedConstructedPath = ltrim(str_replace('\\', '/', $constructedPath), './');

    $routeFile = "/src/app/$normalizedConstructedPath/route.php";
    $indexFile = "/src/app/$normalizedConstructedPath/index.php";

    foreach ($routes as $route) {
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

function redirect(string $url): void
{
    header("Location: $url");
    exit;
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

ob_start();
require_once SETTINGS_PATH . '/request-methods.php';
$metadataArray = require_once APP_PATH . '/metadata.php';
$metadata = "";
$pathname = "";
$content = "";
$childContent = "";

function containsChildContent($filePath)
{
    $fileContent = file_get_contents($filePath);
    $pattern = '/<\?(?:php)?[^?]*\$childContent[^?]*\?>/is';

    if (preg_match($pattern, $fileContent)) {
        return true;
    } else {
        return false;
    }
}

function containsContent($filePath)
{
    $fileContent = file_get_contents($filePath);
    $pattern = '/<\?(?:php\s+)?(?:=|echo|print)\s*\$content\s*;?\s*\?>/i';
    if (preg_match($pattern, $fileContent)) {
        return true;
    } else {
        return false;
    }
}

function modifyOutputLayoutForError($contentToAdd)
{
    $layoutContent = file_get_contents(APP_PATH . '/layout.php');
    if ($layoutContent !== false) {
        $newBodyContent = "<body class=\"fatal-error\">$contentToAdd</body>";

        $modifiedNotFoundContent = preg_replace('~<body.*?>.*?</body>~s', $newBodyContent, $layoutContent);

        echo $modifiedNotFoundContent;
        exit;
    }
}

try {
    $result = determineContentToInclude();
    checkForDuplicateRoutes();
    $contentToInclude = $result['path'] ?? '';
    $layoutsToInclude = $result['layouts'] ?? [];
    $uri = $result['uri'] ?? '';
    $pathname = $uri ? "/" . $uri : "/";
    $metadata = $metadataArray[$uri] ?? $metadataArray['default'];
    if (!empty($contentToInclude) && basename($contentToInclude) === 'route.php') {
        require_once SETTINGS_PATH . '/route-request.php';
        require_once $contentToInclude;
        exit;
    }

    $parentLayoutPath = APP_PATH . '/layout.php';
    $isParentLayout = !empty($layoutsToInclude) && strpos($layoutsToInclude[0], 'src/app/layout.php') !== false;

    if (!containsContent($parentLayoutPath)) {
        $content .= "<div class='error'>The parent layout file does not contain &lt;?php echo \$content ?&gt; Or &lt;?= \$content ?&gt;<br>" . "<strong>$parentLayoutPath</strong></div>";
    }

    ob_start();
    if (!empty($contentToInclude)) {
        if (!$isParentLayout) {
            ob_start();
            require_once $contentToInclude;
            $childContent = ob_get_clean();
        }
        foreach (array_reverse($layoutsToInclude) as $layoutPath) {
            ob_start();
            if ($parentLayoutPath === $layoutPath) continue;
            if (containsChildContent($layoutPath)) {
                require_once $layoutPath;
            } else {
                $content .= "<div class='error'>The layout file does not contain &lt;?php echo \$childContent ?&gt; Or &lt;?= \$childContent ?&gt<br>" . "<strong>$layoutPath</strong></div>";
            }
            $childContent = ob_get_clean();
        }
    } else {
        ob_start();
        require_once APP_PATH . '/not-found.php';
        $childContent = ob_get_clean();
    }

    if ($isParentLayout && !empty($contentToInclude)) {
        ob_start();
        require_once $contentToInclude;
        $childContent = ob_get_clean();
    }

    $content .= $childContent;

    ob_start();
    require_once APP_PATH . '/layout.php';
    echo ob_get_clean();
} catch (Throwable $e) {
    $content = ob_get_clean();
    $content .=  "<div class='error'>Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    modifyOutputLayoutForError($content);
}
