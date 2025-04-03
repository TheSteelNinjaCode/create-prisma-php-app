<?php

declare(strict_types=1);

namespace Lib\PHPX;

use Lib\PrismaPHPSettings;
use Lib\MainLayout;
use DOMDocument;
use DOMElement;
use DOMComment;
use DOMNode;
use RuntimeException;

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

        $templateContent = self::preprocessBindings($templateContent);

        $dom = self::convertToXml($templateContent);

        $root = $dom->documentElement;

        $outputParts = [];
        foreach ($root->childNodes as $child) {
            $outputParts[] = self::processNode($child);
        }

        return implode('', $outputParts);
    }

    protected static function preprocessBindings(string $templateContent): string
    {
        if (strpos($templateContent, '{{') === false) {
            return $templateContent;
        }

        $attributePlaceholders = [];
        $attributePattern = '/(\s(?!pp-bind-)[\w:-]+)=["\']([^"\']*?){{\s*(.+?)\s*}}([^"\']*?)["\']/u';

        $templateContent = preg_replace_callback(
            $attributePattern,
            function ($matches) use (&$attributePlaceholders) {
                $attributeName = trim($matches[1]);
                $beforeBinding = $matches[2];
                $expression    = $matches[3];
                $afterBinding  = $matches[4];

                // Escape the binding expression for attributes.
                $escapedExpression = htmlspecialchars($expression, ENT_QUOTES, 'UTF-8');
                $placeholder       = '%%ATTR_BIND_' . count($attributePlaceholders) . '%%';

                $attributePlaceholders[$placeholder] = " {$attributeName}=\"{$beforeBinding}{$afterBinding}\" pp-bind-{$attributeName}=\"{{ {$escapedExpression} }}\"";
                return $placeholder;
            },
            $templateContent
        );

        // Process text {{ ... }} bindings, but skip ones inside attribute values.
        $textBindingPattern = '/(?:"[^"]*"|\'[^\']*\')(*SKIP)(*FAIL)|{{\s*(.+?)\s*}}/u';
        $templateContent = preg_replace_callback(
            $textBindingPattern,
            function ($matches) {
                $expr = $matches[1];
                // If the expression is a simple word/dot path, use a simple binding.
                if (preg_match('/^[\w.]+$/u', $expr)) {
                    return "<span pp-bind=\"{$expr}\"></span>";
                } else {
                    // Otherwise, encode the expression and use an expression binding.
                    $encodedExpr = htmlspecialchars($expr, ENT_QUOTES, 'UTF-8');
                    return "<span pp-bind-expr=\"{$encodedExpr}\"></span>";
                }
            },
            $templateContent
        );

        $templateContent = strtr($templateContent, $attributePlaceholders);

        return $templateContent;
    }

    public static function injectDynamicContent(string $htmlContent): string
    {
        $patternHeadOpen = '/(<head\b[^>]*>)/i';
        if (preg_match($patternHeadOpen, $htmlContent)) {
            $htmlContent = preg_replace(
                $patternHeadOpen,
                '$1' . MainLayout::outputMetadata(),
                $htmlContent,
                1
            );
        }

        $patternHeadClose = '/(<\/head\s*>)/i';
        if (preg_match($patternHeadClose, $htmlContent)) {
            $htmlContent = preg_replace(
                $patternHeadClose,
                MainLayout::outputHeadScripts() . '$1',
                $htmlContent,
                1
            );
        }

        $patternBodyClose = '/(<\/body\s*>)/i';
        if (preg_match($patternBodyClose, $htmlContent)) {
            $htmlContent = preg_replace(
                $patternBodyClose,
                MainLayout::outputFooterScripts() . '$1',
                $htmlContent,
                1
            );
        }

        return $htmlContent;
    }

    private static function escapeAmpersands(string $content): string
    {
        return preg_replace_callback(
            '/&(.*?)/',
            function ($matches) {
                $str = $matches[0];

                if (preg_match('/^&(?:[a-zA-Z]+|#[0-9]+|#x[0-9A-Fa-f]+);$/', $str)) {
                    return $str;
                }

                return '&amp;' . substr($str, 1);
            },
            $content
        );
    }

    public static function convertToXml(string $templateContent): DOMDocument
    {
        $templateContent = self::escapeAmpersands($templateContent);

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);

        $wrappedContent = "<root>{$templateContent}</root>";

        if (!$dom->loadXML($wrappedContent)) {
            $errors = self::getXmlErrors();
            throw new RuntimeException(
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

            foreach ($node->attributes as $attr) {
                $attributes[$attr->name] = $attr->value;
            }

            $childOutput = [];
            foreach ($node->childNodes as $child) {
                $childOutput[] = self::processNode($child);
            }
            $innerContent = implode('', $childOutput);

            $attributes['children'] = $innerContent;

            return self::processComponent($componentName, $attributes);
        } elseif ($node instanceof DOMComment) {
            return "<!--{$node->textContent}-->";
        }

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

            require_once str_replace('\\', '/', SRC_PATH . '/' . $filePath);

            if (!class_exists($className)) {
                throw new RuntimeException("Class $className does not exist.");
            }

            $componentInstance = new $className($attributes);
            $renderedContent = $componentInstance->render();

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

        if (in_array(strtolower($tagName), self::$selfClosingTags)) {
            return "<{$tagName}{$attrs} />";
        }

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
