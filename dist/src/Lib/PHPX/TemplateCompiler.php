<?php

declare(strict_types=1);

namespace Lib\PHPX;

use Lib\PrismaPHPSettings;
use DOMDocument;
use DOMElement;
use DOMComment;

class TemplateCompiler
{
    protected static $classMappings = [];

    public static function compile(string $templateContent): string
    {
        if (empty(self::$classMappings)) {
            self::initializeClassMappings();
        }

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);

        $wrappedContent = "<root>{$templateContent}</root>";

        if (!$dom->loadXML($wrappedContent)) {
            $errors = self::getXmlErrors();
            throw new \RuntimeException('XML Parsing Failed: ' . implode('; ', $errors));
        }
        libxml_clear_errors();

        $root = $dom->documentElement;
        $output = '';
        foreach ($root->childNodes as $child) {
            $output .= self::processNode($child);
        }

        return $output;
    }

    protected static function getXmlErrors(): array
    {
        $errors = libxml_get_errors();
        $errorMessages = [];

        foreach ($errors as $error) {
            $errorMessages[] = self::formatLibxmlError($error);
        }

        libxml_clear_errors();
        return $errorMessages;
    }

    protected static function formatLibxmlError(\LibXMLError $error): string
    {
        $errorType = match ($error->level) {
            LIBXML_ERR_WARNING => 'Warning',
            LIBXML_ERR_ERROR => 'Error',
            LIBXML_ERR_FATAL => 'Fatal',
            default => 'Unknown',
        };

        // Highlight the tag name in the error message
        $message = trim($error->message);
        if (preg_match('/tag (.*?) /', $message, $matches)) {
            $tag = $matches[1];
            $message = str_replace($tag, "`{$tag}`", $message);
        }

        return sprintf(
            '[%s] Line %d, Column %d: %s',
            $errorType,
            $error->line,
            $error->column,
            $message
        );
    }

    protected static function processNode($node): string
    {
        $output = '';

        if ($node instanceof DOMElement) {
            $componentName = $node->nodeName;
            $attributes = [];

            // Extract attributes
            foreach ($node->attributes as $attr) {
                $attributes[$attr->name] = $attr->value;
            }

            // Process child nodes
            $innerContent = '';
            if ($node->hasChildNodes()) {
                foreach ($node->childNodes as $child) {
                    $innerContent .= self::processNode($child);
                }
            }

            // Include inner content as 'children' if it's not empty
            if (trim($innerContent)) {
                $attributes['children'] = $innerContent;
            }

            $output .= self::processComponent($componentName, $attributes, $innerContent);
        } else if ($node instanceof DOMComment) {
            $output .= "<!--{$node->textContent}-->";
        } else {
            // For text nodes and others
            $output .= $node->textContent;
        }

        return $output;
    }

    protected static function initializeClassMappings()
    {
        foreach (PrismaPHPSettings::$classLogFiles as $classPath => $classInfo) {
            $normalizedClassPath = str_replace('\\', '/', $classPath);
            $className = pathinfo($normalizedClassPath, PATHINFO_FILENAME);
            self::$classMappings[$className] = $classPath;
        }
    }

    protected static function processComponent(string $componentName, array $attributes, string $innerContent): string
    {
        // Check if the component class exists in the mappings
        if (isset(self::$classMappings[$componentName]) && class_exists(self::$classMappings[$componentName])) {
            $classPath = self::$classMappings[$componentName];
            // Instantiate the component
            $componentInstance = new $classPath($attributes);
            return $componentInstance->render();
        } else {
            // Render as an XML tag
            $attributesString = self::renderAttributes($attributes);

            // Self-closing tag if no inner content
            if (empty($innerContent)) {
                return "<$componentName $attributesString />";
            } else {
                return "<$componentName $attributesString>$innerContent</$componentName>";
            }
        }
    }

    protected static function renderAttributes(array $attributes): string
    {
        if (empty($attributes)) {
            return '';
        }

        $attrArray = [];
        foreach ($attributes as $key => $value) {
            if ($key !== 'children') {
                $attrArray[] = "{$key}=\"{$value}\"";
            }
        }

        return ' ' . implode(' ', $attrArray);
    }
}
