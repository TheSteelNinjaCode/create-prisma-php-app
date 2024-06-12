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

    public static function validateDate($value)
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);
        if ($date && $date->format('Y-m-d') === $value) {
            return $value;
        } else {
            return null;
        }
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

    public static function validateEnum($value, $allowedValues)
    {
        return in_array($value, $allowedValues, true);
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
}
