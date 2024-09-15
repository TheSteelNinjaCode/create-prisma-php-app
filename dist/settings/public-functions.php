<?php

/**
 * Redirects the user to the specified URL.
 *
 * @param string $url The URL to redirect to.
 * @param bool $replace Optional. Whether to replace the previous header. Default is true.
 * @param int $responseCode Optional. The HTTP response status code. Default is 0 (no status code).
 * @return void
 */
function redirect(string $url, bool $replace = true, int $responseCode = 0)
{
    global $isWire, $isAjax;

    echo "redirect_7F834=$url";
    if (!$isWire && !$isAjax)
        header("Location: $url", $replace, $responseCode);
    exit;
}

/**
 * Checks if the request is an AJAX request.
 *
 * @return bool True if the request is an AJAX request, false otherwise.
 */
function isAjaxRequest()
{
    $isAjax = false;

    // Check for standard AJAX header
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        $isAjax = true;
    }

    // Check for common AJAX content types
    if (!empty($_SERVER['CONTENT_TYPE'])) {
        $ajaxContentTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
        ];

        foreach ($ajaxContentTypes as $contentType) {
            if (strpos($_SERVER['CONTENT_TYPE'], $contentType) !== false) {
                $isAjax = true;
                break;
            }
        }
    }

    // Check for common AJAX request methods
    $ajaxMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (in_array(strtoupper($_SERVER['REQUEST_METHOD']), $ajaxMethods)) {
        $isAjax = true;
    }

    return $isAjax;
}

/**
 * Checks if the request is a wire request.
 *
 * @return bool True if the request is a wire request, false otherwise.
 */
function isWireRequest(): bool
{
    $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
        $headers = getallheaders();
        return isset($headers['http_pphp_wire_request']) && strtolower($headers['http_pphp_wire_request']) === 'true';
    }

    return false;
}

/**
 * Checks if the request is an X-File request.
 *
 * @return bool True if the request is an X-File request, false otherwise.
 */
function isXFilRequest(): bool
{
    $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
        $headers = getallheaders();
        return isset($headers['http_pphp_x_file_request']) && strtolower($headers['http_pphp_x_file_request']) === 'true';
    }

    return false;
}

/**
 * Get the Bearer token from the Authorization header.
 *
 * @return string|null The Bearer token or null if not present.
 */
function getBearerToken(): ?string
{
    // Normalize headers to handle case-insensitive keys
    $headers = array_change_key_case(getallheaders(), CASE_LOWER);
    $authHeader = $headers['authorization'] ?? null;

    // If not found, try fetching it from $_SERVER as a fallback
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    // Fallback for Apache servers
    if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // Check if the Authorization header is in the expected Bearer format
    if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}
