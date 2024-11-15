<?php

declare(strict_types=1);

namespace Lib\PHPX;

use Lib\PrismaPHPSettings;

class TemplateCompiler
{
    public static function compile($templateContent)
    {
        // Updated pattern to match self-closing and regular tags, allowing for nested tags
        $pattern = '/<([A-Z][a-zA-Z0-9]*)\b([^>]*)\/?>((?:.*?)<\/\1>)?/s';

        $compiledContent = preg_replace_callback($pattern, function ($matches) {
            $componentName = strtolower($matches[1]);
            $attributes = $matches[2];
            $hasClosingTag = isset($matches[3]) && !empty($matches[3]);

            $innerContent = '';
            if ($hasClosingTag) {
                $innerContent = $matches[3];
                // Recursively compile the inner content
                $innerContent = self::compile($innerContent);
            }

            // Parse attributes into an associative array
            $attrArray = self::parseAttributes($attributes);

            if (trim($innerContent)) {
                $attrArray['children'] = $innerContent;
            }

            return self::processComponent($componentName, $attrArray, $innerContent);
        }, $templateContent);

        return $compiledContent;
    }

    protected static function parseAttributes($attributes)
    {
        // Regex to match attributes with and without values
        $attrPattern = '/([a-zA-Z0-9\-]+)(?:="([^"]*)")?/';

        // Capture attributes with and without values
        preg_match_all($attrPattern, $attributes, $attrMatches, PREG_SET_ORDER);
        $attrArray = [];

        foreach ($attrMatches as $attr) {
            if (isset($attr[2])) {
                // Attribute with a value
                $attrArray[$attr[1]] = $attr[2];
            } else {
                // Boolean attribute (e.g., disabled, checked)
                $attrArray[$attr[1]] = true;
            }
        }

        return $attrArray;
    }

    protected static function isClassLogged($componentName)
    {
        // Read the JSON content
        $classLog = PrismaPHPSettings::$classLogFiles;

        // Normalize the component name to ensure case-insensitive comparison
        $normalizedComponent = strtolower($componentName);
        // Loop through the class log to check for a match
        foreach ($classLog as $classPath => $classInfo) {
            $className = strtolower(pathinfo($classPath, PATHINFO_FILENAME));

            if ($normalizedComponent === $className) {
                return $classPath;
            }
        }

        return false;
    }

    protected static function stripSpecificTags($content, $tags)
    {
        foreach ($tags as $tag) {
            // Strip opening and closing tags, case insensitive
            $content = preg_replace('/<' . $tag . '.*?>|<\/' . $tag . '>/i', '', $content);
        }
        return $content;
    }

    protected static function processComponent($componentName, $attrPhp, $innerContent)
    {
        // Start output buffering to capture dynamic content
        ob_start();

        // Check if the class is logged and exists
        $classPath = self::isClassLogged($componentName);
        if ($classPath && class_exists($classPath)) {
            $componentInstance = new $classPath($attrPhp);
            echo $componentInstance->render(); // Echo directly, which will be captured by output buffer
        } else {
            // If no class exists or it wasn't found in the log, render it as an HTML tag
            $attributes = self::renderAttributes($attrPhp);

            // Check if it's a self-closing tag by checking if there's no inner content
            if ($innerContent === '') {
                echo "<$componentName $attributes />";
            } else {
                echo "<$componentName $attributes>$innerContent</$componentName>";
            }
        }

        // Capture and return the output buffer content
        return ob_get_clean();
    }

    protected static function renderAttributes($attrArray)
    {
        // Convert array back into HTML attributes
        $attrString = '';
        foreach ($attrArray as $key => $value) {
            if ($key !== 'children') {
                $attrString .= "{$key}=\"{$value}\" ";
            }
        }

        return trim($attrString);
    }
}
