<?php

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

if (empty($_SERVER["HTTP_X_REQUESTED_WITH"]) || $_SERVER["HTTP_X_REQUESTED_WITH"] != "XMLHttpRequest") {
    header("HTTP/1.0 400 Bad Request");
    echo json_encode(["error" => "Invalid request method or type."]);
    exit;
}

// Determine the request method
$requestMethod = $_SERVER['REQUEST_METHOD'];
$allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

if (!in_array($requestMethod, $allowedMethods)) {
    echo "Method not allowed\n";
    header("HTTP/1.1 405 Method Not Allowed");
    exit;
}

$isGet = $requestMethod === 'GET';
$isPost = $requestMethod === 'POST';
$isPut = $requestMethod === 'PUT';
$isDelete = $requestMethod === 'DELETE';
$isHead = $requestMethod === 'HEAD';
$isOptions = $requestMethod === 'OPTIONS';
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$params = [];

if (stripos($contentType, 'application/json') !== false) {
    $jsonInput = file_get_contents('php://input');
    if (!empty($jsonInput)) {
        $data = json_decode($jsonInput, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $params = $data;
        } else {
            echo json_encode(['error' => 'Error: Invalid JSON body!']);
            exit;
        }
    }
}

$scriptUrl = $_SERVER['REQUEST_URI'];
$scriptUrl = explode('?', $scriptUrl, 2)[0];
$uri = $_SERVER['SCRIPT_URL'] ?? uriExtractor($scriptUrl);

// Check for private directory access
if (strpos($uri, '/_') !== false || strpos($uri, '_') === 0) {
    handleNotFound();
}

$baseDir = __DIR__;

require_once $baseDir . "/settings/paths.php";
require_once $baseDir . "/vendor/autoload.php";

$groupFolder = findGroupFolder($uri);
$filePath = $baseDir . '/src/app' . $groupFolder;

if (basename($filePath) === 'route.php' && file_exists($filePath)) {
    require_once($filePath);
} else {
    handleNotFound();
}

function uriExtractor(string $scriptUrl): string
{
    $prismaPHPSettings = json_decode(file_get_contents("prisma-php.json"), true);
    $projectName = $prismaPHPSettings['projectName'] ?? '';
    if (empty($projectName)) {
        return "/";
    }

    $escapedIdentifier = preg_quote($projectName, '/');
    $pattern = "/(?:{$escapedIdentifier})(\/.+?)(?=\/{$escapedIdentifier}\/|$)/";

    if (preg_match_all($pattern, $scriptUrl, $matches, PREG_SET_ORDER)) {
        $lastMatch = end($matches);
        if (!empty($lastMatch[1])) {
            return $lastMatch[1];
        }
    }

    return "/";
}

function handleNotFound()
{
    header("HTTP/1.0 404 Not Found");
    echo json_encode(['error' => 'Not Found', 'message' => 'The requested resource was not found.']);
    exit;
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

    $normalizedConstructedPath = "/$normalizedConstructedPath/route.php";

    foreach ($routes as $route) {
        $normalizedRoute = trim(str_replace('\\', '/', $route), '.');
        $cleanedRoute = preg_replace('/\/\([^)]+\)/', '', $normalizedRoute);
        if ($cleanedRoute === $normalizedConstructedPath) {
            $bestMatch = $normalizedRoute;
            break;
        }
    }

    return $bestMatch;
}
