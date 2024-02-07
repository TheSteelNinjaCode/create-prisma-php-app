<?php

namespace App\Api;

require_once __DIR__ . "/../../../bootstrap.php";

use Lib\Prisma\Classes\Prisma;

header('Content-Type: application/json');

if (empty($_SERVER["HTTP_X_REQUESTED_WITH"]) || $_SERVER["HTTP_X_REQUESTED_WITH"] != "XMLHttpRequest") {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "This endpoint expects an XMLHttpRequest."]);
    exit;
}

// Retrieve class name, method name, and params from POST data
$className = $_POST["className"] ?? "";
$methodName = $_POST["methodName"] ?? "";
$paramsJson = $_POST["params"] ?? '';

$params = null; // Initialize params as null

// Attempt to decode JSON only if paramsJson is not empty
if (!empty($paramsJson)) {
    $params = json_decode($paramsJson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['error' => 'Error: Invalid JSON in params!']);
        exit;
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
    // Call the method with params if they are provided and decoded; otherwise, call without params
    $result = $params !== null ? call_user_method_with_params($instance, $methodName, $params) : $instance->$methodName();
    // Encode and return the result as JSON
    echo json_encode(['result' => $result instanceof \stdClass ? (array)$result : $result]);
} catch (\ArgumentCountError | \Exception $e) {
    // Catch and return any errors during method execution
    echo json_encode(['error' => "Error: " . $e->getMessage()]);
}

function call_user_method_with_params($instance, $methodName, $params)
{
    // Determine how to call the method based on the presence of specific keys in $params
    if (isset($params['identifier'], $params['data'])) {
        return $instance->$methodName($params['identifier'], $params['data']);
    } elseif (isset($params['criteria'], $params['aggregates'])) {
        return $instance->$methodName($params['criteria'], $params['aggregates']);
    } elseif (isset($params['criteria'], $params['data'])) {
        return $instance->$methodName($params['criteria'], $params['data']);
    } else {
        // If none of the specific keys are present, pass the whole $params array
        return $instance->$methodName($params);
    }
}
