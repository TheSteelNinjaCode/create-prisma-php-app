<?php declare(strict_types=1);

namespace Lib;

class Request
{
    /**
     * The base URL for the application.
     *
     * @var string
     */
    const baseUrl = '/src/app';

    /**
     * @var \ArrayObject $params A static property to hold request parameters.
     *
     * This property is used to hold request parameters that are passed to the request.
     *
     * Example usage:
     * The parameters can be accessed using the following syntax:
     * ```php
     * $id = Request::$params['id'];
     * OR
     * $id = Request::$params->id;
     * ```
     */
    public static \ArrayObject $params;

    /**
     * @var \stdClass $dynamicParams A static property to hold dynamic parameters.
     *
     * This property is used to hold dynamic parameters that are passed to the request.
     *
     * Example usage:
     * Single parameter:
     * ```php
     * $id = Request::$dynamicParams['id'];
     * OR
     * $id = Request::$dynamicParams->id;
     * ```
     *
     * Multiple parameters:
     * ```php
     * $dynamicParams = Request::$dynamicParams;
     * echo '<pre>';
     * print_r($dynamicParams);
     * echo '</pre>';
     * ```
     *
     * The above code will output the dynamic parameters as an array, which can be useful for debugging purposes.
     */
    public static \ArrayObject $dynamicParams;

    /**
     * @var mixed $data Holds request data (e.g., JSON body).
     */
    public static mixed $data = null;

    /**
     * @var string $pathname Holds the request pathname.
     */
    public static string $pathname = '';

    /**
     * @var string $uri Holds the request URI.
     */
    public static string $uri = '';

    /**
     * @var string $referer Holds the referer of the request.
     */
    public static string $referer = '';

    /**
     * @var string $method Holds the request method.
     */
    public static string $method = '';

    /**
     * @var string $contentType Holds the content type of the request.
     */
    public static string $contentType = '';

    /**
     * @var string $protocol The protocol used for the request.
     */
    public static string $protocol = '';

    /**
     * @var string $domainName The domain name of the request.
     */
    public static string $domainName = '';

    /**
     * @var string $scriptName The script name of the request.
     */
    public static string $scriptName = '';

    /**
     * @var string $documentUrl The full document URL of the request.
     */
    public static string $documentUrl = '';

    /**
     * @var string $fileToInclude The file to include in the request.
     */
    public static string $fileToInclude = '';

    /**
     * @var bool $isGet Indicates if the request method is GET.
     */
    public static bool $isGet = false;

    /**
     * @var bool $isPost Indicates if the request method is POST.
     */
    public static bool $isPost = false;

    /**
     * @var bool $isPut Indicates if the request method is PUT.
     */
    public static bool $isPut = false;

    /**
     * @var bool $isDelete Indicates if the request method is DELETE.
     */
    public static bool $isDelete = false;

    /**
     * @var bool $isPatch Indicates if the request method is PATCH.
     */
    public static bool $isPatch = false;

    /**
     * @var bool $isHead Indicates if the request method is HEAD.
     */
    public static bool $isHead = false;

    /**
     * @var bool $isOptions Indicates if the request method is OPTIONS.
     */
    public static bool $isOptions = false;

    /**
     * @var bool $isAjax Indicates if the request is an AJAX request.
     */
    public static bool $isAjax = false;

    /**
     * Indicates whether the request is a wire request.
     *
     * @var bool
     */
    public static bool $isWire = false;

    /**
     * Indicates whether the request is an X-File request.
     *
     * @var bool
     */
    public static bool $isXFileRequest = false;

    /**
     * Initialize the request by setting all static properties.
     */
    public static function init(): void
    {
        self::$dynamicParams = new \ArrayObject([], \ArrayObject::ARRAY_AS_PROPS);

        self::$referer = $_SERVER['HTTP_REFERER'] ?? 'Unknown';
        self::$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        self::$contentType = self::parseContentType();
        self::$domainName = $_SERVER['HTTP_HOST'] ?? '';
        self::$scriptName = dirname($_SERVER['SCRIPT_NAME']);

        self::$isGet = self::$method === 'GET';
        self::$isPost = self::$method === 'POST';
        self::$isPut = self::$method === 'PUT';
        self::$isDelete = self::$method === 'DELETE';
        self::$isPatch = self::$method === 'PATCH';
        self::$isHead = self::$method === 'HEAD';
        self::$isOptions = self::$method === 'OPTIONS';

        self::$isWire = self::isWireRequest();
        self::$isAjax = self::isAjaxRequest();
        self::$isXFileRequest = self::isXFileRequest();
        self::loadParams();
        self::$protocol = self::getProtocol();
        self::$documentUrl = self::$protocol . self::$domainName . self::$scriptName;
    }

    private static function parseContentType(): string
    {
        $contentType = ($_SERVER['CONTENT_TYPE'] ?? '');
        if ($contentType === "") {
            return "";
        }
        $contentType = \explode(';', $contentType, 2)[0];
        return \trim($contentType);
    }

    private static function isJson(): bool
    {
        return 1 === \preg_match('#^application/(|\S+\+)json($|[ ;])#', self::$contentType);
    }

    /**
     * Checks if the request is an AJAX request.
     */
    private static function isAjaxRequest(): bool
    {
        // Check for standard AJAX header
        if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || \strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
            return false;
        }

        // Check for common AJAX content types
        if (!match (self::$contentType) {
                'application/x-www-form-urlencoded',
                'multipart/form-data' => true,
                default => false
            } && !self::isJson()
        ) {
            return false;
        }

        // Check for common AJAX request methods
        return match (self::$method) {
            'POST', 'PUT', 'PATCH', 'DELETE' => true,
            default => false
        };
    }

    /**
     * Checks if the request is a wire request.
     */
    private static function isWireRequest(): bool
    {
        $headers = array_change_key_case(getallheaders());
        return isset($headers['http_pphp_wire_request']) && strtolower($headers['http_pphp_wire_request']) === 'true';
    }

    /**
     * Checks if the request is an X-File request.
     *
     * @return bool True if the request is an X-File request, false otherwise.
     */
    private static function isXFileRequest(): bool
    {
        $serverFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
        if (isset($serverFetchSite) && $serverFetchSite === 'same-origin') {
            $headers = array_change_key_case(getallheaders());
            return isset($headers['http_pphp_x_file_request']) && $headers['http_pphp_x_file_request'] === 'true';
        }

        return false;
    }

    /**
     * Get the request parameters.
     */
    private static function loadParams(): void
    {
        if (self::$method === 'GET') {
            self::$params = new \ArrayObject($_GET, \ArrayObject::ARRAY_AS_PROPS);
            return;
        }

        if (self::$method === 'POST' && self::$contentType === 'multipart/form-data') {
            self::$params = new \ArrayObject($_POST, \ArrayObject::ARRAY_AS_PROPS);
            return;
        }

        if (self::isJson()) {
            $jsonInput = \file_get_contents('php://input');
            if (empty($jsonInput)) {
                \header('HTTP/1.1 400 Bad Request');
                echo '{"error":"Invalid JSON body"}';
                exit;
            }

            self::$data = \json_decode($jsonInput, true);
            if (\json_last_error() === JSON_ERROR_NONE) {
                self::$params = new \ArrayObject(self::$data, \ArrayObject::ARRAY_AS_PROPS);
                return;
            }
        }

        if (self::$contentType === 'application/x-www-form-urlencoded') {

            if (self::$method === 'POST') {
                self::$params = new \ArrayObject($_POST, \ArrayObject::ARRAY_AS_PROPS);
                return;
            }

            if (match (self::$method) {
                'PUT', 'PATCH', 'DELETE' => true,
                default => false
            }) {
                $rawInput = \file_get_contents('php://input');
                if (false !== $rawInput) {
                    \parse_str($rawInput, $parsedParams);
                    unset($rawInput);

                    self::$params = new \ArrayObject($parsedParams, \ArrayObject::ARRAY_AS_PROPS);
                    return;
                }
            }
        }

        self::$params = new \ArrayObject([], \ArrayObject::ARRAY_AS_PROPS);
    }

    /**
     * Get the protocol of the request.
     */
    public static function getProtocol(): string
    {
        return (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') ||
        strtolower((string)($server['HTTP_X_FORWARDED_PROTO'] ?? $server['REQUEST_SCHEME'] ?? '')) === 'https' ||
        ($_SERVER['SERVER_PORT'] ?? '') == 443 ? "https://" : "http://";
    }

    /**
     * Get the Bearer token from the Authorization header.
     */
    public static function getBearerToken(): ?string
    {
        $headers = array_change_key_case(getallheaders());
        $authHeader = $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;

        if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Handle preflight OPTIONS request.
     */
    public static function handlePreflight(): void
    {
        if (self::$method === 'OPTIONS') {
            header('HTTP/1.1 200 OK');
            exit;
        }
    }

    /**
     * Check if the request method is allowed.
     */
    public static function checkAllowedMethods(): void
    {
        if (match (self::$method) {
            'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS' => false,
            default => true
        }) {
            \header('HTTP/1.1 405 Method Not Allowed');
            echo '{"error":"Method not allowed"}';
            exit;
        }
    }

    /**
     * Redirects the client to a specified URL.
     *
     * This method handles both normal and AJAX/wire requests. For normal requests,
     * it sends a standard HTTP redirection header. For AJAX/wire requests, it outputs
     * a custom redirect message.
     *
     * @param string $url The URL to redirect to.
     * @param bool $replace Whether to replace the current header. Default is true.
     * @param int $responseCode The HTTP response code to use for the redirection. Default is 307.
     *
     * @return void
     *
     * @link https://github.com/httpsoft/http-response/blob/master/src/ResponseStatusCodeInterface.php Http Status Codes
     * @link https://tools.ietf.org/html/rfc7231#section-6.4.7 307 Temporary Redirect
     */
    public static function redirect(string $url, bool $replace = true, int $responseCode = 307): void
    {
        // Clean (discard) any previous output
        \ob_clean();

        // Start a fresh output buffer
        \ob_start();

        if (!self::$isWire && !self::$isAjax) {
            // Normal redirect for non-ajax/wire requests
            \ob_end_clean(); // End the buffer, don't send it
            \header("Location: $url", $replace, $responseCode); // Redirect using header

            // Terminate the script to prevent any further output
            exit;
        }

        // For ajax/wire requests, send the custom redirect response
        \ob_clean(); // Clean any previous output
        echo "redirect_7F834=$url"; // Output the redirect message
        \ob_end_flush(); // Flush and send the output buffer

        // Terminate the script to prevent any further output
        exit;
    }
}
