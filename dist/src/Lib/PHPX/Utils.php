<?php

declare(strict_types=1);

namespace Lib\PHPX;

class Utils
{
    public static function mergeClasses(...$classes)
    {
        $classArray = [];

        foreach ($classes as $class) {
            if (!empty(trim($class))) {
                $splitClasses = explode(' ', $class);
                foreach ($splitClasses as $individualClass) {
                    // Extract the base of the class (e.g., bg-red, flex) and replace the previous occurrence
                    // You can customize this based on how Tailwind classes work or specific rules you want
                    $classPrefix = self::getClassPrefix($individualClass);

                    // Update the array, prioritizing the last occurrence
                    $classArray[$classPrefix] = $individualClass;
                }
            }
        }

        // Return the final string of classes after merging
        return implode(' ', array_values($classArray));
    }

    private static function getClassPrefix($class)
    {
        // Implement logic to determine the base of the class (e.g., bg-red-500 -> bg, flex -> flex)
        // This is just an example, and you might need to adjust based on your use case
        if (preg_match('/^(\w+-)/', $class, $matches)) {
            return $matches[1];
        }

        return $class;
    }
}
