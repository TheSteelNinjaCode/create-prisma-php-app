<?php

$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

$allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

if (!in_array($requestMethod, $allowedMethods)) {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$isGet = $requestMethod === 'GET';
$isPost = $requestMethod === 'POST';
$isPut = $requestMethod === 'PUT';
$isDelete = $requestMethod === 'DELETE';
$isPatch = $requestMethod === 'PATCH';
$isHead = $requestMethod === 'HEAD';
$isOptions = $requestMethod === 'OPTIONS';
$isAjax = isAjaxRequest();
$isWire = isWireRequest();
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
    $_SERVER['SERVER_PORT'] == 443 ? "https://" : "http://";
$domainName = $_SERVER['HTTP_HOST'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']) . '/';
$baseUrl = $protocol . $domainName . rtrim($scriptName, '/') . '/src/app/';
$referer = $_SERVER['HTTP_REFERER'] ?? 'Unknown';

$params = [];

if ($requestMethod == 'GET') {
    $params = new \ArrayObject($_GET, \ArrayObject::ARRAY_AS_PROPS);
}

if (stripos($contentType, 'application/json') !== false) {
    $_jsonInputA9117 = file_get_contents('php://input');
    if (!empty($_jsonInputA9117)) {
        $_data53C84 = json_decode($_jsonInputA9117, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $params = new \ArrayObject($_data53C84, \ArrayObject::ARRAY_AS_PROPS);
        } else {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Invalid JSON body']);
            exit;
        }
    }
}

if (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
    if (in_array($requestMethod, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        $_rawInput3127C = file_get_contents('php://input');
        parse_str($_rawInput3127C, $parsedParams);
        $params = new \ArrayObject($parsedParams, \ArrayObject::ARRAY_AS_PROPS);
    } else {
        $params = new \ArrayObject($_POST, \ArrayObject::ARRAY_AS_PROPS);
    }
}
