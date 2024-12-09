<?php

declare(strict_types=1);

namespace Lib\PHPX;

class TwMerge
{
    private static $classGroupPatterns = [
        // **General Padding classes**
        "p" => "/^p-/",

        // **Specific Padding classes**
        "pt" => "/^pt-/",
        "pr" => "/^pr-/",
        "pb" => "/^pb-/",
        "pl" => "/^pl-/",
        "px" => "/^px-/",
        "py" => "/^py-/",

        // **Margin classes (similar logic)**
        "m" => "/^m-/",
        "mt" => "/^mt-/",
        "mr" => "/^mr-/",
        "mb" => "/^mb-/",
        "ml" => "/^ml-/",
        "mx" => "/^mx-/",
        "my" => "/^my-/",

        // **Background color classes**
        "bg" => "/^bg-/",

        // **Text size classes
        "text-size" => '/^text-(xs|sm|base|lg|xl|[2-9]xl)$/',

        // **Text alignment classes**
        "text-alignment" => '/^text-(left|center|right|justify)$/',

        // **Text color classes
        "text-color" => '/^text-(?!xs$|sm$|base$|lg$|xl$|[2-9]xl$).+$/',

        // **Text transform classes**
        "text-transform" =>
        '/^text-(uppercase|lowercase|capitalize|normal-case)$/',

        // **Text decoration classes**
        "text-decoration" => '/^text-(underline|line-through|no-underline)$/',

        // **Border width classes**
        "border-width" => '/^border(-[0-9]+)?$/',

        // **Border color classes**
        "border-color" => "/^border-(?![0-9])/",

        // **Border radius classes**
        "rounded" => '/^rounded(-.*)?$/',

        // **Font weight classes**
        "font" =>
        '/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/',

        // **Hover background color classes**
        "hover:bg" => "/^hover:bg-/",

        // **Hover text color classes**
        "hover:text" => "/^hover:text-/",

        // **Transition classes**
        "transition" => '/^transition(-[a-z]+)?$/',

        // **Opacity classes
        "opacity" => '/^opacity(-[0-9]+)?$/',

        // **Flexbox alignment classes**
        "justify" => "/^justify-(start|end|center|between|around|evenly)$/",

        // **Other utility classes can be added here**
    ];

    private static $conflictGroups = [
        // **Padding conflict groups**
        "p" => ["p", "px", "py", "pt", "pr", "pb", "pl"],
        "px" => ["px", "pl", "pr"],
        "py" => ["py", "pt", "pb"],
        "pt" => ["pt"],
        "pr" => ["pr"],
        "pb" => ["pb"],
        "pl" => ["pl"],

        // **Margin conflict groups**
        "m" => ["m", "mx", "my", "mt", "mr", "mb", "ml"],
        "mx" => ["mx", "ml", "mr"],
        "my" => ["my", "mt", "mb"],
        "mt" => ["mt"],
        "mr" => ["mr"],
        "mb" => ["mb"],
        "ml" => ["ml"],

        // **Border width conflict group**
        "border-width" => ["border-width"],

        // **Border color conflict group**
        "border-color" => ["border-color"],

        // **Text size conflict group**
        "text-size" => ["text-size"],

        // **Text color conflict group**
        "text-color" => ["text-color"],

        // **Text alignment conflict group**
        "text-alignment" => ["text-alignment"],

        // **Text transform conflict group**
        "text-transform" => ["text-transform"],

        // **Text decoration conflict group**
        "text-decoration" => ["text-decoration"],

        // **Opacity conflict group
        "opacity" => ["opacity"],

        // **Flexbox alignment conflict group**
        "justify" => ["justify"],

        // **Add other conflict groups as needed**
    ];

    /**
     * Merges multiple CSS class strings or arrays of CSS class strings into a single, optimized CSS class string.
     *
     * This method processes the provided classes, which can be either strings or arrays of strings, removes
     * duplicate or conflicting classes, and prioritizes the last occurrence of a class. It splits class strings
     * by whitespace, handles conflicting class groups, and ensures a clean and well-formatted output.
     *
     * ### Features:
     * - Accepts individual class strings or arrays of class strings.
     * - Automatically handles arrays by flattening them into individual strings.
     * - Removes duplicate or conflicting classes based on class groups.
     * - Combines all classes into a single string, properly formatted and optimized.
     *
     * @param string|array ...$classes The CSS classes to be merged. Each argument can be a string or an array of strings.
     * @return string A single CSS class string with duplicates and conflicts resolved.
     */
    public static function mergeClasses(string|array ...$classes): string
    {
        $classArray = [];

        foreach ($classes as $class) {
            // Handle arrays by flattening them into strings
            $classList = is_array($class) ? $class : [$class];
            foreach ($classList as $item) {
                if (!empty(trim($item))) {
                    // Split the classes by any whitespace characters
                    $splitClasses = preg_split("/\s+/", $item);
                    foreach ($splitClasses as $individualClass) {
                        $classKey = self::getClassGroup($individualClass);
                        $conflictingKeys = self::getConflictingKeys($classKey);

                        // Remove any conflicting classes
                        foreach ($conflictingKeys as $key) {
                            unset($classArray[$key]);
                        }

                        // Update the array, prioritizing the last occurrence
                        $classArray[$classKey] = $individualClass;
                    }
                }
            }
        }

        // Combine the final classes into a single string
        return implode(" ", array_values($classArray));
    }

    private static function getClassGroup($class)
    {
        // Match optional prefixes (responsive and variants)
        $pattern = '/^((?:[a-z-]+:)*)(.+)$/';

        if (preg_match($pattern, $class, $matches)) {
            $prefixes = $matches[1]; // Includes responsive and variant prefixes
            $utilityClass = $matches[2]; // The utility class

            // Now match utilityClass against patterns
            foreach (self::$classGroupPatterns as $groupKey => $regex) {
                if (preg_match($regex, $utilityClass)) {
                    return $prefixes . $groupKey;
                }
            }

            // If no match, use the full class
            return $prefixes . $utilityClass;
        }

        // For classes without a recognizable prefix, return the class itself
        return $class;
    }

    private static function getConflictingKeys($classKey)
    {
        // Remove any responsive or variant prefixes
        $baseClassKey = preg_replace("/^(?:[a-z-]+:)+/", "", $classKey);

        // Check for conflicts
        if (isset(self::$conflictGroups[$baseClassKey])) {
            // Add responsive and variant prefixes back to the conflicting keys
            $prefix = preg_replace(
                "/" . preg_quote($baseClassKey, "/") . '$/',
                "",
                $classKey
            );
            return array_map(function ($conflict) use ($prefix) {
                return $prefix . $conflict;
            }, self::$conflictGroups[$baseClassKey]);
        }

        return [$classKey];
    }
}
