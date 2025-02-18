<?php

declare(strict_types=1);

namespace Lib;

class MainLayout
{
    public static string $title = '';
    public static string $description = '';
    public static string $children = '';
    public static string $childLayoutChildren = '';
    public static string $html = '';

    private static array $headScripts = [];
    private static array $headScriptsMap = [];
    private static array $footerScripts = [];
    private static array $footerScriptsMap = [];
    private static array $customMetadata = [];

    /**
     * Adds one or more scripts to the head section if they are not already present.
     *
     * @param string ...$scripts The scripts to be added to the head section.
     * @return void
     */
    public static function addHeadScript(string ...$scripts): void
    {
        foreach ($scripts as $script) {
            if (!isset(self::$headScriptsMap[$script])) {
                self::$headScripts[] = $script;
                self::$headScriptsMap[$script] = true;
            }
        }
    }

    /**
     * Adds one or more footer scripts to the list of footer scripts.
     *
     * This method accepts a variable number of string arguments, each representing
     * a script to be added to the footer. If a script is not already in the list,
     * it will be appended.
     *
     * @param string ...$scripts One or more scripts to be added to the footer.
     * @return void
     */
    public static function addFooterScript(string ...$scripts): void
    {
        foreach ($scripts as $script) {
            if (!isset(self::$footerScriptsMap[$script])) {
                self::$footerScripts[] = $script;
                self::$footerScriptsMap[$script] = true;
            }
        }
    }

    /**
     * Generate all the head scripts with dynamic attributes.
     *
     * @return string
     */
    public static function outputHeadScripts(): string
    {
        $headScriptsWithAttributes = array_map(function ($tag) {
            // Check if the tag is a <script>, <link>, or <style> and add the dynamic attribute
            if (strpos($tag, '<script') !== false) {
                return str_replace('<script', '<script pp-dynamic-script="81D7D"', $tag);
            } elseif (strpos($tag, '<link') !== false) {
                return str_replace('<link', '<link pp-dynamic-link="81D7D"', $tag);
            } elseif (strpos($tag, '<style') !== false) {
                return str_replace('<style', '<style pp-dynamic-style="81D7D"', $tag);
            }
            return $tag;
        }, self::$headScripts);

        return implode("\n", $headScriptsWithAttributes);
    }

    /**
     * Generate all the footer scripts.
     *
     * @return string
     */
    public static function outputFooterScripts(): string
    {
        return implode("\n", self::$footerScripts);
    }

    /**
     * Clear all head scripts
     *
     * @return void
     */
    public static function clearHeadScripts(): void
    {
        self::$headScripts = [];
    }

    /**
     * Clear all footer scripts
     *
     * @return void
     */
    public static function clearFooterScripts(): void
    {
        self::$footerScripts = [];
    }

    /**
     * Add custom metadata
     *
     * @param string $key
     * @param string $value
     * @return void
     */
    public static function addCustomMetadata(string $key, string $value): void
    {
        self::$customMetadata[$key] = $value;
    }

    /**
     * Get custom metadata by key
     *
     * @param string $key
     * @return string|null
     */
    public static function getCustomMetadata(string $key): ?string
    {
        return self::$customMetadata[$key] ?? null;
    }

    /**
     * Generate the metadata as meta tags for the head section.
     *
     * @return string
     */
    public static function outputMetadata(): string
    {
        $metadataContent = [
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        ];
        $metadataContent[] = '<title>' . htmlspecialchars(self::$title) . '</title>';

        if (!isset(self::$customMetadata['description'])) {
            self::$customMetadata['description'] = self::$description;
        }

        foreach (self::$customMetadata as $key => $value) {
            $metadataContent[] = '<meta name="' . htmlspecialchars($key) . '" content="' . htmlspecialchars($value) . '" pp-dynamic-meta="81D7D">';
        }

        return implode("\n", $metadataContent);
    }

    /**
     * Clear all custom metadata
     *
     * @return void
     */
    public static function clearCustomMetadata(): void
    {
        self::$customMetadata = [];
    }
}
