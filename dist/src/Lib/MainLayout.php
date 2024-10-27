<?php

namespace Lib;

class MainLayout
{
    public static string $title = '';
    public static string $description = '';
    public static string $children = '';
    public static string $childLayoutChildren = '';

    private static array $headScripts = [];
    private static array $footerScripts = [];
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
            if (!in_array($script, self::$headScripts)) {
                self::$headScripts[] = $script;
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
            if (!in_array($script, self::$footerScripts)) {
                self::$footerScripts[] = $script;
            }
        }
    }

    /**
     * Output all the head scripts
     *
     * @return void
     */
    public static function outputHeadScripts(): void
    {
        $headScriptsWithAttributes = array_map(function ($tag) {
            // Check if the tag is a <link> or <script> and add the dynamic attribute
            if (strpos($tag, '<script') !== false) {
                return str_replace('<script', '<script pp-dynamic-script="81D7D"', $tag);
            } elseif (strpos($tag, '<link') !== false) {
                return str_replace('<link', '<link pp-dynamic-link="81D7D"', $tag);
            }
            return $tag; // Return the tag unchanged if it's neither <script> nor <link>
        }, self::$headScripts);

        echo implode("\n", $headScriptsWithAttributes);
    }

    /**
     * Output all the footer scripts
     *
     * @return void
     */
    public static function outputFooterScripts(): void
    {
        echo implode("\n", self::$footerScripts);
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
     * Output the metadata as meta tags for the head section
     *
     * @return void
     */
    public static function outputMetadata(): void
    {
        // Output standard metadata
        echo '<title>' . htmlspecialchars(self::$title) . '</title>' . "\n";

        // Ensure the description is included in custom metadata if not already present
        if (!isset(self::$customMetadata['description'])) {
            self::$customMetadata['description'] = self::$description;
        }

        $customMetadataContent = [];
        foreach (self::$customMetadata as $key => $value) {
            // Add the dynamic meta ID attribute to each <meta> tag
            $customMetadataContent[] = '<meta name="' . htmlspecialchars($key) . '" content="' . htmlspecialchars($value) . '" pp-dynamic-meta="81D7D">';
        }

        if (!empty($customMetadataContent)) {
            echo implode("\n", $customMetadataContent) . "\n";
        }
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
