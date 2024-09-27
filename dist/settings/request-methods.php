<?php

/**
 * @var string $requestMethod - The request method.
 */
$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

/**
 * @var array $allowedMethods - The allowed request methods.
 */
$allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

if (!in_array($requestMethod, $allowedMethods)) {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

/**
 * @var bool $isGet - True if the request method is GET, false otherwise.
 */
$isGet = $requestMethod === 'GET';
/**
 * @var bool $isPost - True if the request method is POST, false otherwise.
 */
$isPost = $requestMethod === 'POST';
/**
 * @var bool $isPut - True if the request method is PUT, false otherwise.
 */
$isPut = $requestMethod === 'PUT';
/**
 * @var bool $isDelete - True if the request method is DELETE, false otherwise.
 */
$isDelete = $requestMethod === 'DELETE';
/**
 * @var bool $isPatch - True if the request method is PATCH, false otherwise.
 */
$isPatch = $requestMethod === 'PATCH';
/**
 * @var bool $isHead - True if the request method is HEAD, false otherwise.
 */
$isHead = $requestMethod === 'HEAD';
/**
 * @var bool $isOptions - True if the request method is OPTIONS, false otherwise.
 */
$isOptions = $requestMethod === 'OPTIONS';
/**
 * @var bool $isAjax - True if the request is an AJAX request, false otherwise.
 */
$isAjax = isAjaxRequest();
/**
 * @var bool $isWire - True if the request is a wire request, false otherwise.
 */
$isWire = isWireRequest();
/**
 * @var bool $isXFilRequest - True if the request is an X-Fil request, false otherwise.
 */
$isXFilRequest = isXFilRequest();
/**
 * @var string $contentType - The content type of the request.
 */
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
/**
 * @var string $requestedWith - The X-Requested-With header of the request.
 */
$requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
/**
 * @var string $protocol - The protocol of the request.
 */
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
    $_SERVER['SERVER_PORT'] == 443 ? "https://" : "http://";
/**
 * @var string $domainName - The domain name of the request.
 */
$domainName = $_SERVER['HTTP_HOST'];
/**
 * @var string $scriptName - The script name of the request.
 */
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
/**
 * @var string $baseUrl - The base URL of the request.
 */
$baseUrl = '/src/app';
/**
 * @var string $documentUrl - The document URL of the request.
 */
$documentUrl = $protocol . $domainName . $scriptName;
/**
 * @var string $referer - The referer of the request.
 */
$referer = $_SERVER['HTTP_REFERER'] ?? 'Unknown';
/**
 * @var \ArrayObject $params - The request parameters
 */
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
