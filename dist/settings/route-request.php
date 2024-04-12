<?php

header('Content-Type: application/json');

if ($isOptions == 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

// Determine the request method
$allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
if (!in_array($requestMethod, $allowedMethods)) {
    echo "Method not allowed\n";
    header("HTTP/1.1 405 Method Not Allowed");
    exit;
}

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
