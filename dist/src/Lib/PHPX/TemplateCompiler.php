<?php

declare(strict_types=1);

namespace Lib\PHPX;

use Lib\PrismaPHPSettings;
use Lib\MainLayout;
use DOMDocument;
use DOMElement;
use DOMComment;
use DOMNode;
use DOMText;
use RuntimeException;
use Bootstrap;
use LibXMLError;

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
    private static array $sectionStack = [];

    public static function compile(string $templateContent): string
    {
        if (empty(self::$classMappings)) {
            self::initializeClassMappings();
        }

        $dom = self::convertToXml($templateContent);
        $root = $dom->documentElement;

        $output = [];
        foreach ($root->childNodes as $child) {
            $output[] = self::processNode($child);
        }
        return implode('', $output);
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

            $styleBlock = <<<HTML
            <style>
                html:not([data-initial-hydrated]) body {
                    opacity: 0;
                }
                html[data-initial-hydrated] body {
                    opacity: 1;
                }
            </style>
            HTML;

            $htmlContent = preg_replace(
                '/(<\/head\s*>)/i',
                $styleBlock
                    . MainLayout::outputHeadScripts()
                    . '$1',
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
            fn($m) => preg_match('/^&(?:[a-zA-Z]+|#[0-9]+|#x[0-9A-Fa-f]+);$/', $m[0])
                ? $m[0]
                : '&amp;' . substr($m[0], 1),
            $content
        );
    }

    private static function escapeAttributeAngles(string $html): string
    {
        return preg_replace_callback(
            '/(\s[\w:-]+=)([\'"])(.*?)\2/s',
            fn($m) => $m[1] . $m[2] . str_replace(['<', '>'], ['&lt;', '&gt;'], $m[3]) . $m[2],
            $html
        );
    }

    public static function convertToXml(string $templateContent): DOMDocument
    {
        $templateContent = self::escapeAttributeAngles(self::escapeAmpersands($templateContent));
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);

        if (!$dom->loadXML("<root>{$templateContent}</root>")) {
            $errors = self::getXmlErrors();
            throw new RuntimeException("XML Parsing Failed: " . implode("; ", $errors));
        }

        libxml_clear_errors();
        libxml_use_internal_errors(false);
        return $dom;
    }

    protected static function getXmlErrors(): array
    {
        $errors = libxml_get_errors();
        libxml_clear_errors();
        return array_map(fn($e) => self::formatLibxmlError($e), $errors);
    }

    protected static function formatLibxmlError(LibXMLError $error): string
    {
        $type = match ($error->level) {
            LIBXML_ERR_WARNING => 'Warning',
            LIBXML_ERR_ERROR   => 'Error',
            LIBXML_ERR_FATAL   => 'Fatal',
            default            => 'Unknown',
        };
        return sprintf(
            "[%s] Line %d, Col %d: %s",
            $type,
            $error->line,
            $error->column,
            trim($error->message)
        );
    }

    protected static function processNode(DOMNode $node, bool $inBody = false): string
    {
        if ($node instanceof DOMText) {
            return self::processTextNode($node);
        }

        if ($node instanceof DOMElement) {
            $pushed = false;
            $tag    = strtolower($node->nodeName);

            if ($tag === 'script' && $inBody && !$node->hasAttribute('src')) {
                $node->setAttribute('type', 'text/php');
            }

            if ($node->hasAttribute('pp-section-id')) {
                self::$sectionStack[] = $node->getAttribute('pp-section-id');
                $pushed = true;
            }

            self::processAttributes($node);

            if (isset(self::$classMappings[$node->nodeName])) {
                $html = self::renderComponent(
                    $node,
                    $node->nodeName,
                    self::getNodeAttributes($node)
                );
                if ($pushed) {
                    array_pop(self::$sectionStack);
                }
                return $html;
            }

            $children = '';
            foreach ($node->childNodes as $c) {
                $children .= self::processNode($c, $inBody || $tag === 'body');
            }
            $attrs = self::getNodeAttributes($node) + ['children' => $children];
            $out   = self::renderAsHtml($node->nodeName, $attrs);

            if ($pushed) {
                array_pop(self::$sectionStack);
            }
            return $out;
        }

        if ($node instanceof DOMComment) {
            return "<!--{$node->textContent}-->";
        }

        return $node->textContent;
    }

    private static function processTextNode(DOMText $node): string
    {
        return preg_replace_callback(
            '/{{\s*(.+?)\s*}}/u',
            fn($m) => self::processBindingExpression(trim($m[1])),
            $node->textContent
        );
    }

    private static function processAttributes(DOMElement $node): void
    {
        foreach ($node->attributes as $a) {
            if (!preg_match('/{{\s*(.+?)\s*}}/u', $a->value, $m)) {
                continue;
            }

            $rawExpr = trim($m[1]);
            $node->setAttribute("pp-bind-{$a->name}", $rawExpr);
        }
    }

    private static function processBindingExpression(string $expr): string
    {
        if (preg_match('/^[\w.]+$/u', $expr)) {
            return "<span pp-bind=\"{$expr}\"></span>";
        }
        return "<span pp-bind-expr=\"" . htmlspecialchars($expr, ENT_QUOTES, 'UTF-8') . "\"></span>";
    }

    protected static function renderComponent(DOMElement $node, string $componentName, array $incomingProps): string
    {
        $mapping = self::selectComponentMapping($componentName);
        $attributes = $incomingProps;

        $attributes['pp-sync-script'] = 's' . base_convert(sprintf('%u', crc32($mapping['className'])), 10, 36);

        $instance = self::initializeComponentInstance($mapping, $attributes);

        $childHtml = '';
        foreach ($node->childNodes as $c) {
            $childHtml .= self::processNode($c, false);
        }
        $instance->children = $childHtml;

        $html = $instance->render();
        if (strpos($html, '{{') !== false || self::hasComponentTag($html)) {
            $html = self::compile($html);
        }

        return $html;
    }

    private static function selectComponentMapping(string $componentName): array
    {
        if (!isset(self::$classMappings[$componentName])) {
            throw new RuntimeException("Component {$componentName} not registered");
        }
        $mappings = self::$classMappings[$componentName];

        $srcNorm = str_replace('\\', '/', SRC_PATH) . '/';
        $relImp  = str_replace($srcNorm, '', str_replace('\\', '/', Bootstrap::$contentToInclude));

        if (isset($mappings[0]) && is_array($mappings[0])) {
            foreach ($mappings as $entry) {
                $imp = isset($entry['importer'])
                    ? str_replace('\\', '/', $entry['importer'])
                    : '';
                if (str_replace($srcNorm, '', $imp) === $relImp) {
                    return $entry;
                }
            }
            return $mappings[0];
        }
        return $mappings;
    }

    protected static function initializeComponentInstance(array $mapping, array $attributes)
    {
        if (!isset($mapping['className'], $mapping['filePath'])) {
            throw new RuntimeException("Invalid mapping");
        }
        $className = $mapping['className'];
        $filePath  = $mapping['filePath'];

        require_once str_replace('\\', '/', SRC_PATH . '/' . $filePath);
        if (!class_exists($className)) {
            throw new RuntimeException("Class {$className} not found");
        }

        return new $className($attributes);
    }

    protected static function initializeClassMappings(): void
    {
        foreach (PrismaPHPSettings::$classLogFiles as $tag => $cls) {
            self::$classMappings[$tag] = $cls;
        }
    }

    protected static function hasComponentTag(string $html): bool
    {
        return preg_match('/<\/*[A-Z][\w-]*/u', $html) === 1;
    }

    private static function getNodeAttributes(DOMElement $node): array
    {
        $out = [];
        foreach ($node->attributes as $a) {
            $out[$a->name] = $a->value;
        }
        return $out;
    }

    private static function renderAsHtml(string $tag, array $attrs): string
    {
        $pairs = [];
        foreach ($attrs as $k => $v) {
            if ($k !== 'children') {
                $pairs[] = "{$k}=\"{$v}\"";
            }
        }
        $attrStr = $pairs ? ' ' . implode(' ', $pairs) : '';
        return in_array(strtolower($tag), self::$selfClosingTags)
            ? "<{$tag}{$attrStr} />"
            : "<{$tag}{$attrStr}>{$attrs['children']}</{$tag}>";
    }
}
