<?php

namespace Lib;

use HTMLPurifier;
use HTMLPurifier_Config;

class Validator
{
    // String Validation

    /**
     * Validate and sanitize a string.
     *
     * This function converts the input to a string, trims any leading or trailing 
     * whitespace, and converts special characters to HTML entities to prevent 
     * XSS attacks. If the input is null, an empty string is returned.
     *
     * @param mixed $value The value to validate and sanitize. This can be of any type.
     * @return string The sanitized string. If the input is not a string or null, it is converted to its string representation before sanitization. If the input is null, an empty string is returned.
     */
    public static function string($value): string
    {
        // Convert the value to a string if it's not null
        $stringValue = $value !== null ? (string)$value : '';
        // Return the HTML-escaped string
        return htmlspecialchars(trim($stringValue), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Validate an email address.
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid email address or null if invalid.
     */
    public static function email($value): ?string
    {
        return filter_var($value, FILTER_VALIDATE_EMAIL) !== false ? $value : null;
    }

    /**
     * Validate a URL.
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid URL or null if invalid.
     */
    public static function url($value): ?string
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false ? $value : null;
    }

    /**
     * Validate an IP address.
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid IP address or null if invalid.
     */
    public static function ip($value): ?string
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false ? $value : null;
    }

    /**
     * Validate a UUID.
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid UUID or null if invalid.
     */
    public static function uuid($value): ?string
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $value) ? $value : null;
    }

    /**
     * Validate a CUID.
     * 
     * @param mixed $value The value to validate.
     * @return string|null The valid CUID or null if invalid.
     */
    public static function cuid($value): ?string
    {
        return preg_match('/^c[0-9a-z]{8,}$/', $value) ? $value : null;
    }

    /**
     * Validate a size string (e.g., "10MB").
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid size string or null if invalid.
     */
    public static function bytes($value): ?string
    {
        return preg_match('/^[0-9]+[kKmMgGtT]?[bB]?$/', $value) ? $value : null;
    }

    /**
     * Validate an XML string.
     *
     * @param mixed $value The value to validate.
     * @return string|null The valid XML string or null if invalid.
     */
    public static function xml($value): ?string
    {
        return preg_match('/^<\?xml/', $value) ? $value : null;
    }

    // Number Validation

    /**
     * Validate an integer value.
     *
     * @param mixed $value The value to validate.
     * @return int|null The integer value or null if invalid.
     */
    public static function int($value): ?int
    {
        return filter_var($value, FILTER_VALIDATE_INT) !== false ? (int)$value : null;
    }

    /**
     * Validate a big integer value.
     *
     * @param mixed $value The value to validate.
     * @return int|null The integer value or null if invalid.
     */
    public static function bigInt($value): ?int
    {
        return self::int($value);
    }

    /**
     * Validate a float value.
     *
     * @param mixed $value The value to validate.
     * @return float|null The float value or null if invalid.
     */
    public static function float($value): ?float
    {
        return filter_var($value, FILTER_VALIDATE_FLOAT) !== false ? (float)$value : null;
    }

    /**
     * Validate a decimal value.
     *
     * @param mixed $value The value to validate.
     * @return float|null The float value or null if invalid.
     */
    public static function decimal($value): ?float
    {
        return self::float($value);
    }

    // Date Validation

    /**
     * Validate a date in a given format.
     *
     * @param mixed $value The value to validate.
     * @param string $format The date format.
     * @return string|null The valid date string or null if invalid.
     */
    public static function date($value, string $format = 'Y-m-d'): ?string
    {
        $date = \DateTime::createFromFormat($format, $value);
        return $date && $date->format($format) === $value ? $value : null;
    }

    /**
     * Validate a datetime in a given format.
     *
     * @param mixed $value The value to validate.
     * @param string $format The datetime format.
     * @return string|null The valid datetime string or null if invalid.
     */
    public static function dateTime($value, string $format = 'Y-m-d H:i:s'): ?string
    {
        return self::date($value, $format);
    }

    // Boolean Validation

    /**
     * Validate a boolean value.
     *
     * @param mixed $value The value to validate.
     * @return bool|null The boolean value or null if invalid.
     */
    public static function boolean($value): ?bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    // Other Validation

    /**
     * Validate a JSON string.
     *
     * @param mixed $value The value to validate.
     * @return bool True if valid JSON, false otherwise.
     */
    public static function json($value): bool
    {
        json_decode($value);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Validate an enum value against allowed values.
     *
     * @param mixed $value The value to validate.
     * @param array $allowedValues The allowed values.
     * @return bool True if value is allowed, false otherwise.
     */
    public static function enum($value, array $allowedValues): bool
    {
        return in_array($value, $allowedValues, true);
    }

    /**
     * Purify and sanitize HTML content.
     *
     * @param string $html The HTML content to purify.
     * @return string The purified HTML content.
     */
    public static function html(string $html): string
    {
        $config = HTMLPurifier_Config::createDefault();
        $purifier = new HTMLPurifier($config);
        return $purifier->purify($html);
    }

    /**
     * Converts emojis or special characters in the message content to appropriate HTML entities or format.
     *
     * @param string $content The content to process.
     * @return string The processed content.
     */
    public static function emojis($content): string
    {
        static $emojiMap = [
            ':)' => '😊',
            ':-)' => '😊',
            ':(' => '☹️',
            ':-(' => '☹️',
            ':D' => '😄',
            ':-D' => '😄',
            ':P' => '😛',
            ':-P' => '😛',
            ';)' => '😉',
            ';-)' => '😉',
            ':o' => '😮',
            ':-o' => '😮',
            ':O' => '😮',
            ':-O' => '😮',
            'B)' => '😎',
            'B-)' => '😎',
            ':|' => '😐',
            ':-|' => '😐',
            ':/' => '😕',
            ':-/' => '😕',
            ':\\' => '😕',
            ':-\\' => '😕',
            ':*' => '😘',
            ':-*' => '😘',
            '<3' => '❤️',
            '</3' => '💔',
            ':@' => '😡',
            ':-@' => '😡',
            ':S' => '😖',
            ':-S' => '😖',
            ':$' => '😳',
            ':-$' => '😳',
            ':X' => '🤐',
            ':-X' => '🤐',
            ':#' => '🤐',
            ':-#' => '🤐',
            ':^)' => '😊',
            ':v' => '😋',
            ':3' => '😺',
            'O:)' => '😇',
            'O:-)' => '😇',
            '>:)' => '😈',
            '>:-)' => '😈',
            'D:' => '😧',
            'D-:' => '😧',
            ':-o' => '😯',
            ':p' => '😋',
            ':-p' => '😋',
            ':b' => '😋',
            ':-b' => '😋',
            ':^/' => '😕',
            ':-^/' => '😕',
            '>_<' => '😣',
            '-_-' => '😑',
            '^_^' => '😊',
            'T_T' => '😢',
            'TT_TT' => '😭',
            'xD' => '😆',
            'XD' => '😆',
            'xP' => '😝',
            'XP' => '😝',
            ':wave:' => '👋',
            ':thumbsup:' => '👍',
            ':thumbsdown:' => '👎',
            ':clap:' => '👏',
            ':fire:' => '🔥',
            ':100:' => '💯',
            ':poop:' => '💩',
            ':smile:' => '😄',
            ':smirk:' => '😏',
            ':sob:' => '😭',
            ':heart:' => '❤️',
            ':broken_heart:' => '💔',
            ':grin:' => '😁',
            ':joy:' => '😂',
            ':cry:' => '😢',
            ':angry:' => '😠',
            ':sunglasses:' => '😎',
            ':kiss:' => '😘',
            ':thinking:' => '🤔',
            ':shocked:' => '😲',
            ':shhh:' => '🤫',
            ':nerd:' => '🤓',
            ':cool:' => '😎',
            ':scream:' => '😱',
            ':zzz:' => '💤',
            ':celebrate:' => '🎉',
            ':ok_hand:' => '👌',
            ':pray:' => '🙏',
            ':muscle:' => '💪',
            ':tada:' => '🎉',
            ':eyes:' => '👀',
            ':star:' => '⭐',
            ':bulb:' => '💡',
            ':chicken:' => '🐔',
            ':cow:' => '🐮',
            ':dog:' => '🐶',
            ':cat:' => '🐱',
            ':fox:' => '🦊',
            ':lion:' => '🦁',
            ':penguin:' => '🐧',
            ':pig:' => '🐷',
            ':rabbit:' => '🐰',
            ':tiger:' => '🐯',
            ':unicorn:' => '🦄',
            ':bear:' => '🐻',
            ':elephant:' => '🐘',
            ':monkey:' => '🐒',
            ':panda:' => '🐼',
        ];

        return strtr($content, $emojiMap);
    }
}
