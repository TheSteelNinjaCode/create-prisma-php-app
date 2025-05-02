<?php

namespace Lib;

use RuntimeException;
use InvalidArgumentException;

class IncludeTracker
{
    public static array $sections = [];

    /**
     * Includes and echoes a file wrapped in a unique pp-section-id container.
     * Supported $mode values: 'include', 'include_once', 'require', 'require_once'
     * 
     * @param string $filePath The path to the file to be included.
     * @param string $mode The mode of inclusion. Can be 'include', 'include_once', 'require', or 'require_once'.
     * @throws RuntimeException If the file does not exist.
     * @throws InvalidArgumentException If an invalid mode is provided.
     * @return void
     */
    public static function render(string $filePath, string $mode = 'include_once'): void
    {
        if (!file_exists($filePath)) {
            throw new RuntimeException("File not found: $filePath");
        }

        ob_start();

        switch ($mode) {
            case 'include':
                include $filePath;
                break;
            case 'include_once':
                include_once $filePath;
                break;
            case 'require':
                require $filePath;
                break;
            case 'require_once':
                require_once $filePath;
                break;
            default:
                throw new InvalidArgumentException("Invalid include mode: $mode");
        }

        $output = ob_get_clean();
        $wrapped = self::wrapWithId($filePath, $output);

        self::$sections[$filePath] = [
            'path' => $filePath,
            'html' => $wrapped,
        ];

        echo $wrapped;
    }

    private static function wrapWithId(string $filePath, string $html): string
    {
        $id = 's' . base_convert(sprintf('%u', crc32($filePath)), 10, 36);

        return "<div pp-section-id=\"$id\">\n$html\n</div>";
    }
}
