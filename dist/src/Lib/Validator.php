<?php

declare(strict_types=1);

namespace Lib;

use HTMLPurifier;
use HTMLPurifier_Config;

final class Validator
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

    /**
     * Validate a value against a set of rules.
     *
     * @param mixed $value The value to validate.
     * @param string $rules A pipe-separated string of rules (e.g., 'required|min:2|max:50').
     * @param mixed $confirmationValue The value to confirm against, if applicable.
     * @return bool|string|null True if validation passes, string with error message if fails, or null for optional field.
     */
    public static function withRules($value, string $rules, $confirmationValue = null)
    {
        $rulesArray = explode('|', $rules);
        foreach ($rulesArray as $rule) {
            // Handle parameters in rules, e.g., 'min:10'
            if (strpos($rule, ':') !== false) {
                [$ruleName, $parameter] = explode(':', $rule);
                $result = self::applyRule($ruleName, $parameter, $value, $confirmationValue);
            } else {
                $result = self::applyRule($rule, null, $value, $confirmationValue);
            }

            // If a validation rule fails, return the error message
            if ($result !== true) {
                return $result;
            }
        }
        return true;
    }

    /**
     * Apply an individual rule to a value.
     *
     * @param string $rule The rule to apply.
     * @param mixed $parameter The parameter for the rule, if applicable.
     * @param mixed $value The value to validate.
     * @return bool|string True if the rule passes, or a string with an error message if it fails.
     */
    private static function applyRule(string $rule, $parameter, $value, $confirmationValue = null)
    {
        switch ($rule) {
            case 'required':
                if (empty($value) && $value !== '0') {
                    return "This field is required.";
                } else {
                    return true;
                }
                break;
            case 'min':
                if (strlen($value) < (int)$parameter) {
                    return "This field must be at least $parameter characters long.";
                } else {
                    return true;
                }
                break;
            case 'max':
                if (strlen($value) > (int)$parameter) {
                    return "This field must not exceed $parameter characters.";
                } else {
                    return true;
                }
                break;
            case 'startsWith':
                if (strpos($value, $parameter) !== 0) {
                    return "This field must start with $parameter.";
                } else {
                    return true;
                }
                break;
            case 'endsWith':
                if (substr($value, -strlen($parameter)) !== $parameter) {
                    return "This field must end with $parameter.";
                } else {
                    return true;
                }
                break;
            case 'confirmed':
                if ($confirmationValue !== $value) {
                    return "The $rule confirmation does not match.";
                } else {
                    return true;
                }
                break;
            case 'email':
                return self::email($value) ? true : "This field must be a valid email address.";
            case 'url':
                return self::url($value) ? true : "This field must be a valid URL.";
            case 'ip':
                return self::ip($value) ? true : "This field must be a valid IP address.";
            case 'uuid':
                return self::uuid($value) ? true : "This field must be a valid UUID.";
            case 'cuid':
                return self::cuid($value) ? true : "This field must be a valid CUID.";
            case 'int':
                return self::int($value) !== null ? true : "This field must be an integer.";
            case 'float':
                return self::float($value) !== null ? true : "This field must be a float.";
            case 'boolean':
                return self::boolean($value) !== null ? true : "This field must be a boolean.";
            case 'in':
                if (!in_array($value, explode(',', $parameter), true)) {
                    return "The selected value is invalid.";
                } else {
                    return true;
                }
                break;
            case 'notIn':
                if (in_array($value, explode(',', $parameter), true)) {
                    return "The selected value is invalid.";
                } else {
                    return true;
                }
                break;
            case 'size':
                if (strlen($value) !== (int)$parameter) {
                    return "This field must be exactly $parameter characters long.";
                } else {
                    return true;
                }
                break;
            case 'between':
                [$min, $max] = explode(',', $parameter);
                if (strlen($value) < (int)$min || strlen($value) > (int)$max) {
                    return "This field must be between $min and $max characters long.";
                } else {
                    return true;
                }
                break;
            case 'date':
                return self::date($value, $parameter ?: 'Y-m-d') ? true : "This field must be a valid date.";
            case 'dateFormat':
                if (!\DateTime::createFromFormat($parameter, $value)) {
                    return "This field must match the format $parameter.";
                } else {
                    return true;
                }
                break;
            case 'before':
                if (strtotime($value) >= strtotime($parameter)) {
                    return "This field must be a date before $parameter.";
                } else {
                    return true;
                }
                break;
            case 'after':
                if (strtotime($value) <= strtotime($parameter)) {
                    return "This field must be a date after $parameter.";
                } else {
                    return true;
                }
                break;
            case 'json':
                return self::json($value) ? true : "This field must be a valid JSON string.";
                break;
            case 'timezone':
                if (!in_array($value, timezone_identifiers_list())) {
                    return "This field must be a valid timezone.";
                } else {
                    return true;
                }
                break;
            case 'regex':
                if (!preg_match($parameter, $value)) {
                    return "This field format is invalid.";
                } else {
                    return true;
                }
                break;
            case 'digits':
                if (!ctype_digit($value) || strlen($value) != $parameter) {
                    return "This field must be $parameter digits.";
                } else {
                    return true;
                }
                break;
            case 'digitsBetween':
                [$min, $max] = explode(',', $parameter);
                if (!ctype_digit($value) || strlen($value) < (int)$min || strlen($value) > (int)$max) {
                    return "This field must be between $min and $max digits.";
                } else {
                    return true;
                }
                break;
            case 'extensions':
                $extensions = explode(',', $parameter);
                if (!self::isExtensionAllowed($value, $extensions)) {
                    return "The file must have one of the following extensions: " . implode(', ', $extensions) . ".";
                } else {
                    return true;
                }
                break;
            case 'mimes':
                $mimeTypes = explode(',', $parameter);
                if (!self::isMimeTypeAllowed($value, $mimeTypes)) {
                    return "The file must be of type: " . implode(', ', $mimeTypes) . ".";
                } else {
                    return true;
                }
                break;
            case 'file':
                if (!is_uploaded_file($value)) {
                    return "This field must be a valid file.";
                } else {
                    return true;
                }
                break;
                // Add additional rules as needed...
            default:
                return true;
        }
    }

    /**
     * Check if a file's extension is in the list of allowed extensions.
     *
     * @param string $file The path or filename of the file.
     * @param array $allowedExtensions The list of allowed extensions.
     * @return bool True if the extension is allowed, false otherwise.
     */
    private static function isExtensionAllowed($file, array $allowedExtensions): bool
    {
        // Extract the file extension
        $fileExtension = pathinfo($file, PATHINFO_EXTENSION);

        // Check if the extension is in the allowed list
        return in_array(strtolower($fileExtension), array_map('strtolower', $allowedExtensions), true);
    }

    /**
     * Check if a file's MIME type is in the list of allowed MIME types.
     *
     * @param string $file The path or filename of the file.
     * @param array $allowedMimeTypes The list of allowed MIME types.
     * @return bool True if the MIME type is allowed, false otherwise.
     */
    private static function isMimeTypeAllowed($file, array $allowedMimeTypes)
    {
        // Check if the file is a valid uploaded file
        if (!is_uploaded_file($file)) {
            return false;
        }

        // Get the MIME type of the file using PHP's finfo_file function
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file);
        finfo_close($finfo);

        // Check if the MIME type is in the list of allowed MIME types
        if (in_array($mimeType, $allowedMimeTypes, true)) {
            return true;
        }

        return false;
    }
}
