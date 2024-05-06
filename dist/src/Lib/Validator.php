<?php

namespace Lib;

class Validator
{
    public static function validateString($value)
    {
        if ($value === null) {
            return '';
        }

        return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
    }

    public static function validateInt($value)
    {
        return filter_var($value, FILTER_VALIDATE_INT);
    }

    public static function validateFloat($value)
    {
        return filter_var($value, FILTER_VALIDATE_FLOAT);
    }

    public static function validateBoolean($value)
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    public static function validateDateTime($value)
    {
        $date = \DateTime::createFromFormat('Y-m-d H:i:s', $value);
        if ($date && $date->format('Y-m-d H:i:s') === $value) {
            return $value;
        } else {
            return null;
        }
    }

    public static function validateJson($value)
    {
        json_decode($value);
        return json_last_error() === JSON_ERROR_NONE;
    }

    public static function validateBigInt($value)
    {
        return filter_var($value, FILTER_VALIDATE_INT); // Or custom validation for larger numbers
    }

    public static function validateBytes($value)
    {
        // Custom validation based on your application's handling of binary data
        return true; // Placeholder
    }

    public static function validateDecimal($value)
    {
        return filter_var($value, FILTER_VALIDATE_FLOAT); // Or custom validation for fixed-point numbers
    }

    public static function validateEnum($value, $allowedValues)
    {
        return in_array($value, $allowedValues, true);
    }

    public static function validateUnique($value)
    {
        // This validation should be handled at the database level or in your application logic
        return true; // Placeholder
    }

    public static function validateId($value)
    {
        // Validate based on your application's ID format (e.g., integer, UUID)
        return static::validateInt($value); // Placeholder
    }

    public static function validateDate($value)
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);
        if ($date && $date->format('Y-m-d') === $value) {
            return $value;
        } else {
            return null;
        }
    }

    public static function validateEmail($value)
    {
        if ($value === null) {
            return '';
        }

        return filter_var($value, FILTER_VALIDATE_EMAIL, FILTER_NULL_ON_FAILURE);
    }

    public static function validateUrl($value)
    {
        if ($value === null) {
            return '';
        }

        return filter_var($value, FILTER_VALIDATE_URL, FILTER_NULL_ON_FAILURE);
    }

    public static function validateUnsupported($value)
    {
        // Placeholder for future data types
        return true; // No validation
    }
}
