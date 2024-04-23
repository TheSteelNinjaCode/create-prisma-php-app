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
    $scriptUrl = $_SERVER['REQUEST_URI'];
    $scriptUrl = explode('?', $scriptUrl, 2)[0];
    $uri = $_SERVER['SCRIPT_URL'] ?? uriExtractor($scriptUrl);
    $uri = ltrim($uri, '/');
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

function uriExtractor(string $scriptUrl): string
{
    $prismaPHPSettings = json_decode(file_get_contents("prisma-php.json"), true);
    $projectName = $prismaPHPSettings['projectName'] ?? '';
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
    global $filesListRoutes;
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

        if (file_exists($jsonFileName)) {
            $filesListRoutes = json_decode(file_get_contents($jsonFileName), true);
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
    global $filesListRoutes;
    global $dynamicRouteParams;
    $uriMatch = null;
    $normalizedUri = ltrim(str_replace('\\', '/', $uri), './');
    $normalizedUriEdited = "src/app/$normalizedUri/route.php";
    $uriSegments = explode('/', $normalizedUriEdited);
    foreach ($filesListRoutes as $route) {
        $normalizedRoute = trim(str_replace('\\', '/', $route), '.');
        $routeSegments = explode('/', ltrim($normalizedRoute, '/'));
        $singleDynamic = preg_match_all('/\[[^\]]+\]/', $normalizedRoute, $matches) === 1 && !strpos($normalizedRoute, '[...');
        if ($singleDynamic) {
            $segmentMatch = singleDynamicRoute($uriSegments, $routeSegments);
            if (!empty($segmentMatch)) {
                $trimSegmentMatch = trim($segmentMatch, '[]');
                $dynamicRouteParams = [$trimSegmentMatch => $uriSegments[array_search($segmentMatch, $routeSegments)]];
                $uriMatch = $normalizedRoute;
                break;
            }
        } elseif (strpos($normalizedRoute, '[...') !== false) {
            $cleanedRoute = preg_replace('/\[\.\.\..*?\].*/', '', $normalizedRoute);
            if (strpos('/src/app/' . $normalizedUri, $cleanedRoute) === 0) {
                if (strpos($normalizedRoute, 'route.php') !== false) {
                    $normalizedUriEdited = "/src/app/$normalizedUri";
                    $trimNormalizedUriEdited = str_replace($cleanedRoute, '', $normalizedUriEdited);
                    $explodedNormalizedUri = explode('/', $trimNormalizedUriEdited);
                    $pattern = '/\[\.\.\.(.*?)\]/';
                    if (preg_match($pattern, $normalizedRoute, $matches)) {
                        $contentWithinBrackets = $matches[1];
                        $dynamicRouteParams = [$contentWithinBrackets => $explodedNormalizedUri];
                    }

                    $uriMatch = $normalizedRoute;
                    break;
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
    global $filesListRoutes;
    $bestMatch = null;
    $normalizedConstructedPath = ltrim(str_replace('\\', '/', $constructedPath), './');

    $routeFile = "/src/app/$normalizedConstructedPath/route.php";
    $indexFile = "/src/app/$normalizedConstructedPath/index.php";

    foreach ($filesListRoutes as $route) {
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
    if (count($routeSegments) != count($uriSegments)) {
        return $segmentMatch;
    }

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
    global $filesListRoutes;
    $normalizedRoutesMap = [];
    foreach ($filesListRoutes as $route) {
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

ob_start();
require_once SETTINGS_PATH . '/public-functions.php';
require_once SETTINGS_PATH . '/request-methods.php';
$metadataArray = require_once APP_PATH . '/metadata.php';
$filesListRoutes = [];
$metadata = "";
$uri = "";
$pathname = "";
$dynamicRouteParams = [];
$content = "";
$childContent = "";

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

    $isContentIncluded = false;
    $isChildContentIncluded = false;
    if (containsContent($parentLayoutPath)) {
        $isContentIncluded = true;
    }

    ob_start();
    if (!empty($contentToInclude)) {
        if (!$isParentLayout) {
            ob_start();
            require_once $contentToInclude;
            $childContent = ob_get_clean();
        }
        foreach (array_reverse($layoutsToInclude) as $layoutPath) {
            if ($parentLayoutPath === $layoutPath) {
                continue;
            }

            if (containsChildContent($layoutPath)) {
                $isChildContentIncluded = true;
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

    if ($isParentLayout && !empty($contentToInclude)) {
        ob_start();
        require_once $contentToInclude;
        $childContent = ob_get_clean();
    }

    if (!$isContentIncluded && !$isChildContentIncluded) {
        $content .= $childContent;
        ob_start();
        require_once APP_PATH . '/layout.php';
    } else {
        if ($isContentIncluded) {
            $content .= "<div class='error'>The parent layout file does not contain &lt;?php echo \$content; ?&gt; Or &lt;?= \$content ?&gt;<br>" . "<strong>$parentLayoutPath</strong></div>";
            modifyOutputLayoutForError($content);
        } else {
            $content .= "<div class='error'>The layout file does not contain &lt;?php echo \$childContent; ?&gt; or &lt;?= \$childContent ?&gt;<br><strong>$layoutPath</strong></div>";
            modifyOutputLayoutForError($content);
        }
    }
} catch (Throwable $e) {
    $content = ob_get_clean();
    $content .=  "<div class='error'>Unhandled Exception: " . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    modifyOutputLayoutForError($content);
}
