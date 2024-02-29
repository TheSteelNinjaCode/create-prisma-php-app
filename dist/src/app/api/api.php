<?php

namespace App\Api;

require_once __DIR__ . "/../../../bootstrap.php";

use Lib\Prisma\Classes\Prisma;

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Accept, Origin, Authorization, X-CSRF-Token');
header('Content-Type: application/json');

// Preflight request handling
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check for valid POST request with XMLHttpRequest
if ($_SERVER["REQUEST_METHOD"] !== "POST" || empty($_SERVER["HTTP_X_REQUESTED_WITH"]) || $_SERVER["HTTP_X_REQUESTED_WITH"] != "XMLHttpRequest") {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "Invalid request method or type."]);
    exit;
}

// Initialize variables
$className = $methodName = $paramsJson = "";
$params = null;

// Determine request content type
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

// Handle JSON content type
if (stripos($contentType, 'application/json') !== false) {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $className = $input['className'] ?? '';
        $methodName = $input['methodName'] ?? '';
        // Directly assign $params without double decoding
        $params = $input['params'] ?? []; // Initialize as empty array if not set
    } else {
        echo json_encode(['error' => 'Error: Invalid JSON body!']);
        exit;
    }
} else {
    // Handle form-urlencoded data
    $className = $_POST["className"] ?? "";
    $methodName = $_POST["methodName"] ?? "";
    $paramsJson = $_POST["params"] ?? "";
    if (!empty($paramsJson)) {
        $params = json_decode($paramsJson, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(['error' => 'Error: Invalid JSON in params!']);
            exit;
        }
    } else {
        $params = []; // Initialize as empty array if not set
    }
}

// Construct the full class name and check for class and property existence
$fullClassName = "Lib\\Prisma\\Classes\\" . $className;
if (!class_exists($fullClassName) || !property_exists(Prisma::class, $className)) {
    echo json_encode(['error' => "Error: Class $fullClassName not found or property $className not found in Prisma class!"]);
    exit;
}

// Create an instance of the class
$instance = (new Prisma())->$className;

// Check for method existence
if (!method_exists($instance, $methodName)) {
    echo json_encode(['error' => "Error: Method $methodName not found in class $fullClassName!"]);
    exit;
}

try {
    $result = $instance->$methodName($params);
    echo json_encode(['result' => $result instanceof \stdClass ? (array)$result : $result]);
} catch (\ArgumentCountError | \Exception $e) {
    echo json_encode(['error' => "Error: " . $e->getMessage()]);
}
