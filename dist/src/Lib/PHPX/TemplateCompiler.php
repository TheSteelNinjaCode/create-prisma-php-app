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
    protected static $selfClosingTags = [
        'area',
        'base',
        'br',
        'col',
        'command',
        'embed',
        'hr',
        'img',
        'input',
        'keygen',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr'
    ];

    public static function compile(string $templateContent): string
    {
        if (empty(self::$classMappings)) {
            self::initializeClassMappings();
        }

        // Convert template to valid XML
        $dom = self::convertToXml($templateContent);

        // Process the converted XML
        $root = $dom->documentElement;
        $output = "";

        foreach ($root->childNodes as $child) {
            $output .= self::processNode($child);
        }

        return $output;
    }

    public static function convertToXml(string $templateContent): DOMDocument
    {
        // Escape `&` characters that are not part of valid XML entities
        $templateContent = preg_replace_callback(
            '/&(.*?)/',
            function ($matches) {
                $str = $matches[0];

                // If it already looks like a valid entity, leave it alone.
                // This check can be as simple or as robust as you need.
                if (preg_match('/^&(?:[a-zA-Z]+|#[0-9]+|#x[0-9A-Fa-f]+);$/', $str)) {
                    return $str;
                }

                // Otherwise, escape it.
                return '&amp;' . substr($str, 1);
            },
            $templateContent
        );

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);

        $wrappedContent = "<root>{$templateContent}</root>";

        if (!$dom->loadXML($wrappedContent)) {
            $errors = self::getXmlErrors();
            throw new \RuntimeException(
                "XML Parsing Failed: " . implode("; ", $errors)
            );
        }
        libxml_clear_errors();

        return $dom;
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
            LIBXML_ERR_WARNING => "Warning",
            LIBXML_ERR_ERROR => "Error",
            LIBXML_ERR_FATAL => "Fatal",
            default => "Unknown",
        };

        // Highlight the tag name in the error message
        $message = trim($error->message);
        if (preg_match("/tag (.*?) /", $message, $matches)) {
            $tag = $matches[1];
            $message = str_replace($tag, "`{$tag}`", $message);
        }

        return sprintf(
            "[%s] Line %d, Column %d: %s",
            $errorType,
            $error->line,
            $error->column,
            $message
        );
    }

    protected static function processNode($node): string
    {
        $output = "";

        if ($node instanceof DOMElement) {
            $componentName = $node->nodeName;
            $attributes = [];

            // Extract attributes
            foreach ($node->attributes as $attr) {
                $attributes[$attr->name] = $attr->value;
            }

            // Process child nodes
            $innerContent = "";
            if ($node->hasChildNodes()) {
                foreach ($node->childNodes as $child) {
                    $innerContent .= self::processNode($child);
                }
            }

            // Include inner content as 'children' 
            $attributes["children"] = $innerContent;

            $output .= self::processComponent(
                $componentName,
                $attributes,
                $innerContent
            );
        } elseif ($node instanceof DOMComment) {
            $output .= "<!--{$node->textContent}-->";
        } else {
            // For text nodes and others
            $output .= $node->textContent;
        }

        return $output;
    }

    protected static function initializeClassMappings(): void
    {
        foreach (PrismaPHPSettings::$classLogFiles as $tagName => $fullyQualifiedClassName) {
            self::$classMappings[$tagName] = $fullyQualifiedClassName;
        }
    }

    protected static function processComponent(
        string $componentName,
        array $attributes,
        string $innerContent
    ): string {
        if (isset(self::$classMappings[$componentName])) {
            $classMapping = self::$classMappings[$componentName];

            // Ensure the required file is included
            require_once str_replace('\\', '/', SRC_PATH . '/' . $classMapping['filePath']);

            // Use the fully qualified class name
            $className = $classMapping['className'];

            // Check if the class exists
            if (class_exists($className)) {
                // Instantiate the component
                $componentInstance = new $className($attributes);

                // Render the component
                $renderedContent = $componentInstance->render();

                // Check if the rendered content contains other components
                if (strpos($renderedContent, '<') !== false) {
                    // Re-parse the rendered content
                    return self::compile($renderedContent);
                }

                // Return the plain rendered content if no components are detected
                return $renderedContent;
            } else {
                throw new \RuntimeException("Class $className does not exist.");
            }
        } else {
            // Render as an HTML tag
            $attributesString = self::renderAttributes($attributes);

            // Determine if the tag should be self-closing
            if (in_array(strtolower($componentName), self::$selfClosingTags)) {
                return "<$componentName $attributesString />";
            } else {
                return "<$componentName $attributesString>$innerContent</$componentName>";
            }
        }
    }

    protected static function renderAttributes(array $attributes): string
    {
        if (empty($attributes)) {
            return "";
        }

        $attrArray = [];
        foreach ($attributes as $key => $value) {
            if ($key !== "children") {
                $attrArray[] = "{$key}=\"{$value}\"";
            }
        }

        return " " . implode(" ", $attrArray);
    }
}
