<?php

declare(strict_types=1);

namespace Lib\PHPX;

use Lib\PrismaPHPSettings;
use DOMDocument;
use DOMElement;
use DOMComment;
use DOMNode;

class TemplateCompiler
{
    protected static array $classMappings = [];
    protected static array $selfClosingTags = [
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

        $outputParts = [];
        foreach ($root->childNodes as $child) {
            $outputParts[] = self::processNode($child);
        }

        return implode('', $outputParts);
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
        libxml_use_internal_errors(false);

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

    protected static function processNode(DOMNode $node): string
    {
        if ($node instanceof DOMElement) {
            $componentName = $node->nodeName;
            $attributes = [];

            // Gather element attributes
            foreach ($node->attributes as $attr) {
                $attributes[$attr->name] = $attr->value;
            }

            // Recursively get child content
            $childOutput = [];
            foreach ($node->childNodes as $child) {
                $childOutput[] = self::processNode($child);
            }
            $innerContent = implode('', $childOutput);

            // We'll store 'children' for potential component logic
            $attributes['children'] = $innerContent;

            // Pass to processComponent for final decision
            return self::processComponent($componentName, $attributes);
        } elseif ($node instanceof DOMComment) {
            // Preserve HTML comments
            return "<!--{$node->textContent}-->";
        }

        // For text/cdata nodes, return text
        return $node->textContent;
    }

    protected static function initializeClassMappings(): void
    {
        foreach (PrismaPHPSettings::$classLogFiles as $tagName => $fullyQualifiedClassName) {
            self::$classMappings[$tagName] = $fullyQualifiedClassName;
        }
    }

    protected static function processComponent(string $componentName, array $attributes): string
    {
        if (isset(self::$classMappings[$componentName])) {
            $className = self::$classMappings[$componentName]['className'];
            $filePath = self::$classMappings[$componentName]['filePath'];

            // Ensure the required file is included
            require_once str_replace('\\', '/', SRC_PATH . '/' . $filePath);

            if (!class_exists($className)) {
                throw new \RuntimeException("Class $className does not exist.");
            }

            // Instantiate the component
            $componentInstance = new $className($attributes);
            $renderedContent = $componentInstance->render();

            // re-compile to handle further components
            if (strpos($renderedContent, '<') !== false) {
                return self::compile($renderedContent);
            }
            return $renderedContent;
        }

        return self::renderAsHtml($componentName, $attributes);
    }

    protected static function renderAsHtml(string $tagName, array $attributes): string
    {
        $attrs = self::renderAttributes($attributes);

        // Check if it's self-closing
        if (in_array(strtolower($tagName), self::$selfClosingTags)) {
            return "<{$tagName}{$attrs} />";
        }

        // Normal open/close
        $innerContent = $attributes['children'] ?? '';
        return "<{$tagName}{$attrs}>{$innerContent}</{$tagName}>";
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
