<?php

namespace Lib;

class MainLayout
{
    private static $headScripts = [];
    private static $footerScripts = [];

    // Default metadata properties
    public static string $title = '';
    public static string $description = '';

    // Custom metadata storage
    private static array $customMetadata = [];

    /**
     * Adds one or more scripts to the head section if they are not already present.
     *
     * @param string ...$scripts The scripts to be added to the head section.
     */
    public static function addHeadScript(string ...$scripts)
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
     */
    public static function addFooterScript(string ...$scripts)
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
    public static function outputHeadScripts()
    {
        echo implode("\n", self::$headScripts);
    }

    /**
     * Output all the footer scripts
     *
     * @return void
     */
    public static function outputFooterScripts()
    {
        echo implode("\n", self::$footerScripts);
    }

    /**
     * Clear all head scripts
     *
     * @return void
     */
    public static function clearHeadScripts()
    {
        self::$headScripts = [];
    }

    /**
     * Clear all footer scripts
     *
     * @return void
     */
    public static function clearFooterScripts()
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
    public static function addCustomMetadata(string $key, string $value)
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
    public static function outputMetadata()
    {
        // Output standard metadata
        echo '<title>' . htmlspecialchars(self::$title) . '</title>' . "\n";
        echo '<meta name="description" content="' . htmlspecialchars(self::$description) . '">' . "\n";

        // Output custom metadata
        foreach (self::$customMetadata as $key => $value) {
            echo '<meta name="' . htmlspecialchars($key) . '" content="' . htmlspecialchars($value) . '">' . "\n";
        }
    }

    /**
     * Clear all custom metadata
     *
     * @return void
     */
    public static function clearCustomMetadata()
    {
        self::$customMetadata = [];
    }
}
