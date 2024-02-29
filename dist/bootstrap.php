<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/settings/paths.php';
require_once __DIR__ . '/vendor/autoload.php';

$metadata = include __DIR__ . '/src/app/metadata.php';

function determineContentToInclude()
{
    global $metadata;

    $subject = $_SERVER["SCRIPT_NAME"];
    preg_match("/^(.*)\/src\/app\//", $subject, $matches);

    $requestUri = explode('?', $_SERVER['REQUEST_URI'], 2)[0];
    $requestUri = rtrim($requestUri, '/');
    $requestUri = str_replace($matches[1], '', $requestUri);
    $uri = trim($requestUri, '/');
    $baseDir = __DIR__ . '/src/app';
    $includePath = '';
    $metadata = $metadata[$uri] ?? $metadata['default'];

    if ($uri) {
        $path = $baseDir . '/' . $uri . '.php';
        if (file_exists($path)) {
            $includePath = $path;
        } else {
            $path = $baseDir . '/' . $uri . '/index.php';
            if (file_exists($path)) {
                $includePath = $path;
            }
        }
    } else {
        $includePath = $baseDir . '/index.php';
    }

    return ['path' => $includePath];
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$domainName = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['SCRIPT_NAME']);
$baseUrl = $protocol . $domainName . rtrim($scriptPath, '/') . '/';

ob_start();

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($exception) {
    echo "<div class='error'>An error occurred: " . $exception->getMessage() . "</div>";
});

set_exception_handler(function ($exception) use (&$content) {
    ob_start();
    echo "<div class='error'>An error occurred: " . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";
    $content .= ob_get_clean();
});

register_shutdown_function(function () use (&$content) {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        ob_start();
        echo "<div class='error'>An error occurred: " . $error['message'] . "</div>";
        $errorContent = ob_get_clean();
        $content = $errorContent . $content;
        ob_clean();
        echo "<html><body>{$content}</body></html>";
    }
});

try {
    $result = determineContentToInclude();
    $contentToInclude = $result['path'] ?? '';

    if (!empty($contentToInclude)) {
        require_once $contentToInclude;
    } else {
        require_once "not-found.php";
    }
} catch (Throwable $e) {
    echo "<div class='error'>An error occurred: " . $e->getMessage() . "</div>";
}

$content = ob_get_clean();
