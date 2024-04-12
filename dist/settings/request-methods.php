<?php

$requestMethod = $_SERVER['REQUEST_METHOD'];
$isGet = $requestMethod === 'GET';
$isPost = $requestMethod === 'POST';
$isPut = $requestMethod === 'PUT';
$isDelete = $requestMethod === 'DELETE';
$isPatch = $requestMethod === 'PATCH';
$isHead = $requestMethod === 'HEAD';
$isOptions = $requestMethod === 'OPTIONS';
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$domainName = $_SERVER['HTTP_HOST'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']) . '/';
$baseUrl = $protocol . $domainName . rtrim($scriptName, '/') . '/src/app/';
