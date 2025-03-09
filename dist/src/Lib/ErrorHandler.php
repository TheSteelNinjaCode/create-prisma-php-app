<?php

namespace Lib;

use Bootstrap;
use Lib\MainLayout;

class ErrorHandler
{
    public static string $content = '';

    public static function registerHandlers(): void
    {
        self::registerExceptionHandler();
        self::registerShutdownFunction();
        self::registerErrorHandler();
    }

    private static function registerExceptionHandler(): void
    {
        set_exception_handler(function ($exception) {
            $errorContent = Bootstrap::isAjaxOrXFileRequestOrRouteFile()
                ? "Exception: " . $exception->getMessage()
                : "<div class='error'>Exception: " . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . "</div>";

            self::modifyOutputLayoutForError($errorContent);
        });
    }

    private static function registerShutdownFunction(): void
    {
        register_shutdown_function(function () {
            $error = error_get_last();
            if (
                $error !== null &&
                in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR], true)
            ) {
                $errorContent = Bootstrap::isAjaxOrXFileRequestOrRouteFile()
                    ? "Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']
                    : "<div class='error'>Fatal Error: " . htmlspecialchars($error['message'], ENT_QUOTES, 'UTF-8') .
                    " in " . htmlspecialchars($error['file'], ENT_QUOTES, 'UTF-8') .
                    " on line " . $error['line'] . "</div>";

                self::modifyOutputLayoutForError($errorContent);
            }
        });
    }

    private static function registerErrorHandler(): void
    {
        set_error_handler(function ($severity, $message, $file, $line) {
            if (!(error_reporting() & $severity)) {
                return;
            }
            $errorContent = Bootstrap::isAjaxOrXFileRequestOrRouteFile()
                ? "Error: {$severity} - {$message} in {$file} on line {$line}"
                : "<div class='error'>Error: {$message} in {$file} on line {$line}</div>";

            if ($severity === E_WARNING || $severity === E_NOTICE) {
                self::modifyOutputLayoutForError($errorContent);
            }
        });
    }

    public static function checkFatalError(): void
    {
        $error = error_get_last();
        if (
            $error !== null &&
            in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR], true)
        ) {
            $errorContent = Bootstrap::isAjaxOrXFileRequestOrRouteFile()
                ? "Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']
                : "<div class='error'>Fatal Error: " . htmlspecialchars($error['message'], ENT_QUOTES, 'UTF-8') .
                " in " . htmlspecialchars($error['file'], ENT_QUOTES, 'UTF-8') .
                " on line " . $error['line'] . "</div>";

            self::modifyOutputLayoutForError($errorContent);
        }
    }

    public static function modifyOutputLayoutForError($contentToAdd): void
    {
        $errorFile = APP_PATH . '/error.php';
        $errorFileExists = file_exists($errorFile);

        if ($_ENV['SHOW_ERRORS'] === "false") {
            if ($errorFileExists) {
                $contentToAdd = Bootstrap::isAjaxOrXFileRequestOrRouteFile() ? "An error occurred" : "<div class='error'>An error occurred</div>";
            } else {
                exit;
            }
        }

        if ($errorFileExists) {
            if (ob_get_level()) {
                ob_end_clean();
            }
            self::$content = $contentToAdd;
            if (Bootstrap::isAjaxOrXFileRequestOrRouteFile()) {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'error' => self::$content]);
                http_response_code(403);
            } else {
                $layoutFile = APP_PATH . '/layout.php';
                if (file_exists($layoutFile)) {
                    ob_start();
                    require_once $errorFile;
                    MainLayout::$children = ob_get_clean();
                    require $layoutFile;
                } else {
                    echo self::$content;
                }
            }
        } else {
            if (Bootstrap::isAjaxOrXFileRequestOrRouteFile()) {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'error' => $contentToAdd]);
                http_response_code(403);
            } else {
                echo $contentToAdd;
            }
        }
        exit;
    }
}
