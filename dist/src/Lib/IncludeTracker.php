<?php

namespace Lib;

use RuntimeException;
use InvalidArgumentException;
use Lib\PrismaPHPSettings;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Lib\PHPX\TemplateCompiler;

class IncludeTracker
{
    public static array $sections = [];

    /**
     * Includes and echoes a file wrapped in a unique pp-section-id container.
     * Supported $mode values: 'include', 'include_once', 'require', 'require_once'
     *
     * @param string $filePath The path to the file to be included.
     * @param string $mode     The mode of inclusion.
     * @throws RuntimeException        If the file does not exist.
     * @throws InvalidArgumentException If an invalid mode is provided.
     * @return void
     */
    public static function render(string $filePath, string $mode = 'include_once'): void
    {
        if (!file_exists($filePath)) {
            throw new RuntimeException("File not found: $filePath");
        }

        ob_start();
        match ($mode) {
            'include'       => include $filePath,
            'include_once'  => include_once $filePath,
            'require'       => require $filePath,
            'require_once'  => require_once $filePath,
            default         => throw new InvalidArgumentException("Invalid include mode: $mode"),
        };
        $html = ob_get_clean();

        $wrapped  = self::wrapWithId($filePath, $html);
        $fragDom  = TemplateCompiler::convertToXml($wrapped, false);

        self::prefixInlineHandlers($fragDom);

        $newHtml = TemplateCompiler::innerXml($fragDom);

        self::$sections[$filePath] = [
            'path' => $filePath,
            'html' => $newHtml,
        ];

        echo $newHtml;
    }

    private static function wrapWithId(string $filePath, string $html): string
    {
        $id = 's' . base_convert(sprintf('%u', crc32($filePath)), 10, 36);
        return "<div pp-section-id=\"$id\">\n$html\n</div>";
    }

    private static function prefixInlineHandlers(DOMDocument $doc): void
    {
        $xp = new DOMXPath($doc);

        /** @var DOMElement $el */
        foreach ($xp->query('//*') as $el) {
            $handlers = [];

            foreach (iterator_to_array($el->attributes) as $attr) {
                $name = $attr->name;

                if (!str_starts_with($name, 'on')) {
                    continue;
                }

                $event = substr($name, 2);
                if (
                    !in_array($event, PrismaPHPSettings::$htmlEvents, true) ||
                    trim($attr->value) === ''
                ) {
                    continue;
                }

                $handlers[$name] = $attr->value;
                $el->removeAttribute($name);
            }

            foreach ($handlers as $origName => $value) {
                $el->setAttribute("pp-inc-{$origName}", $value);
            }
        }
    }
}
