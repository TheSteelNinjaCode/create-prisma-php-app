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
use DOMXPath;
use ReflectionClass;
use ReflectionProperty;

class TemplateCompiler
{
    protected const BINDING_REGEX = '/\{\{\s*((?:(?!\{\{|\}\})[\s\S])*?)\s*\}\}/uS';

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
    private static int $compileDepth = 0;
    private static array $componentInstanceCounts = [];
    private static array $reflections       = [];
    private static array $constructors      = [];
    private static array $publicProperties  = [];

    public static function compile(string $templateContent): string
    {
        if (self::$compileDepth === 0) {
            self::$componentInstanceCounts = [];
        }
        self::$compileDepth++;

        if (empty(self::$classMappings)) {
            self::initializeClassMappings();
        }

        $dom = self::convertToXml($templateContent);
        $root = $dom->documentElement;

        $output = [];
        foreach ($root->childNodes as $child) {
            $output[] = self::processNode($child);
        }

        self::$compileDepth--;
        return implode('', $output);
    }

    public static function injectDynamicContent(string $htmlContent): string
    {
        $headOpenPattern = '/(<head\b[^>]*>)/i';

        $htmlContent = preg_replace(
            $headOpenPattern,
            '$1' . MainLayout::outputMetadata(),
            $htmlContent,
            1
        );

        $headClosePattern = '/(<\/head\s*>)/i';
        $headScripts      = MainLayout::outputHeadScripts();
        $htmlContent = preg_replace(
            $headClosePattern,
            $headScripts . '$1',
            $htmlContent,
            1
        );

        if (!isset($_SERVER['HTTP_X_PPHP_NAVIGATION'])) {
            $htmlContent = preg_replace(
                '/<body([^>]*)>/i',
                '<body$1 hidden>',
                $htmlContent,
                1
            );
        }

        $bodyClosePattern = '/(<\/body\s*>)/i';

        $htmlContent = preg_replace(
            $bodyClosePattern,
            MainLayout::outputFooterScripts() . '$1',
            $htmlContent,
            1
        );

        return $htmlContent;
    }

    private static function escapeAmpersands(string $content): string
    {
        return preg_replace(
            '/&(?![a-zA-Z][A-Za-z0-9]*;|#[0-9]+;|#x[0-9A-Fa-f]+;)/',
            '&amp;',
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

    private static function escapeMustacheAngles(string $content): string
    {
        return preg_replace_callback(
            '/\{\{[\s\S]*?\}\}/u',
            fn($m) => str_replace(['<', '>'], ['&lt;', '&gt;'], $m[0]),
            $content
        );
    }

    public static function convertToXml(string $templateContent): DOMDocument
    {
        $templateContent = self::protectInlineScripts($templateContent);
        $templateContent = self::normalizeNamedEntities($templateContent);

        $templateContent = self::escapeMustacheAngles(
            self::escapeAttributeAngles(
                self::escapeAmpersands($templateContent)
            )
        );

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

    private static function normalizeNamedEntities(string $html): string
    {
        return preg_replace_callback(
            '/&([a-zA-Z][a-zA-Z0-9]+);/',
            static function (array $m): string {
                $decoded = html_entity_decode($m[0], ENT_HTML5, 'UTF-8');

                if ($decoded === $m[0]) {
                    return $m[0];
                }

                if (function_exists('mb_ord')) {
                    return '&#' . mb_ord($decoded, 'UTF-8') . ';';
                }

                $code = unpack('N', mb_convert_encoding($decoded, 'UCS-4BE', 'UTF-8'))[1];
                return '&#' . $code . ';';
            },
            $html
        );
    }

    private static function protectInlineScripts(string $html): string
    {
        return preg_replace_callback(
            '#<script\b([^>]*?)>(.*?)</script>#is',
            static function ($m) {
                if (preg_match('/\bsrc\s*=/i', $m[1])) {
                    return $m[0];
                }

                if (strpos($m[2], '<![CDATA[') !== false) {
                    return $m[0];
                }

                if (preg_match('/\btype\s*=\s*(["\']?)(?!text\/|application\/javascript|module)/i', $m[1])) {
                    return $m[0];
                }

                $code = str_replace(']]>', ']]]]><![CDATA[>', $m[2]);

                return "<script{$m[1]}><![CDATA[\n{$code}\n]]></script>";
            },
            $html
        );
    }

    public static function innerXml(DOMNode $node): string
    {
        if ($node instanceof DOMDocument) {
            $node = $node->documentElement;
        }

        /** @var DOMDocument $doc */
        $doc  = $node->ownerDocument;

        $html = '';
        foreach ($node->childNodes as $child) {
            $html .= $doc->saveXML($child);
        }
        return $html;
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

    protected static function processNode(DOMNode $node): string
    {
        if ($node instanceof DOMText) {
            return self::processTextNode($node);
        }

        if ($node instanceof DOMElement) {
            $pushed = false;
            $tag    = strtolower($node->nodeName);

            if (
                $tag === 'script' &&
                !$node->hasAttribute('src') &&
                !$node->hasAttribute('type')
            ) {
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
                $children .= self::processNode($c);
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
            self::BINDING_REGEX,
            fn($m) => self::processBindingExpression(trim($m[1])),
            $node->textContent
        );
    }

    private static function processAttributes(DOMElement $node): void
    {
        foreach ($node->attributes as $a) {
            if (!preg_match(self::BINDING_REGEX, $a->value, $m)) {
                continue;
            }

            $rawExpr = trim($m[1]);
            $node->setAttribute("pp-bind-{$a->name}", $rawExpr);
        }
    }

    private static function processBindingExpression(string $expr): string
    {
        $escaped = htmlspecialchars($expr, ENT_QUOTES, 'UTF-8');

        if (preg_match('/^[\w.]+$/u', $expr)) {
            return "<span pp-bind=\"{$escaped}\"></span>";
        }

        return "<span pp-bind-expr=\"{$escaped}\"></span>";
    }

    protected static function renderComponent(
        DOMElement $node,
        string $componentName,
        array $incomingProps
    ): string {
        $incomingProps = self::sanitizeIncomingProps($incomingProps);
        $mapping       = self::selectComponentMapping($componentName);
        $instance      = self::initializeComponentInstance($mapping, $incomingProps);

        $childHtml = '';
        foreach ($node->childNodes as $c) {
            $childHtml .= self::processNode($c);
        }

        $instance->children = self::sanitizeEventAttributes($childHtml);

        $baseId   = 's' . base_convert(sprintf('%u', crc32($mapping['className'])), 10, 36);
        $idx      = self::$componentInstanceCounts[$baseId] ?? 0;
        self::$componentInstanceCounts[$baseId] = $idx + 1;
        $sectionId = $idx === 0 ? $baseId : "{$baseId}{$idx}";

        $html     = $instance->render();
        $fragDom  = self::convertToXml($html);
        $xpath    = new DOMXPath($fragDom);

        /** @var DOMElement $el */
        foreach ($xpath->query('//*') as $el) {

            $tag = $el->tagName;
            if (ctype_upper($tag[0]) || isset(self::$classMappings[$tag])) {
                continue;
            }

            $originalEvents  = [];
            $componentEvents = [];

            foreach (iterator_to_array($el->attributes) as $attr) {
                $name  = $attr->name;
                $value = $attr->value;

                if (str_starts_with($name, 'pp-original-')) {
                    $origName                   = substr($name, strlen('pp-original-'));
                    $originalEvents[$origName]  = $value;
                } elseif (str_starts_with($name, 'on')) {
                    $event = substr($name, 2);
                    if ($value !== '' && in_array($event, PrismaPHPSettings::$htmlEvents, true)) {
                        $componentEvents[$name] = $value;
                    }
                }
            }

            foreach (array_keys($originalEvents)  as $k) $el->removeAttribute("pp-original-{$k}");
            foreach (array_keys($componentEvents) as $k) $el->removeAttribute($k);

            foreach ($componentEvents as $evAttr => $compValue) {
                $el->setAttribute("data-pp-child-{$evAttr}", $compValue);

                if (isset($originalEvents[$evAttr])) {
                    $el->setAttribute("data-pp-parent-{$evAttr}", $originalEvents[$evAttr]);
                    unset($originalEvents[$evAttr]);
                }
            }

            foreach ($originalEvents as $name => $value) {
                $el->setAttribute($name, $value);
            }
        }

        $root = $fragDom->documentElement;
        foreach ($root->childNodes as $c) {
            if ($c instanceof DOMElement) {
                $c->setAttribute('pp-phpx-id', $sectionId);
                break;
            }
        }

        $htmlOut = self::innerXml($fragDom);
        if (
            str_contains($htmlOut, '{{') ||
            self::hasComponentTag($htmlOut) ||
            stripos($htmlOut, '<script') !== false
        ) {
            $htmlOut = self::compile($htmlOut);
        }

        return $htmlOut;
    }

    protected static function sanitizeIncomingProps(array $props): array
    {
        foreach ($props as $key => $val) {
            if (str_starts_with($key, 'on')) {
                $event = substr($key, 2);
                if (in_array($event, PrismaPHPSettings::$htmlEvents, true) && trim((string)$val) !== '') {
                    $props["pp-original-on{$event}"] = (string)$val;
                    unset($props[$key]);
                }
            }
        }

        return $props;
    }

    protected static function sanitizeEventAttributes(string $html): string
    {
        $fragDom = self::convertToXml($html, false);
        $xpath   = new DOMXPath($fragDom);

        /** @var DOMElement $el */
        foreach ($xpath->query('//*') as $el) {
            foreach (iterator_to_array($el->attributes) as $attr) {
                $name = strtolower($attr->name);

                if (!str_starts_with($name, 'on')) {
                    continue;
                }

                $event = substr($name, 2);
                $value = trim($attr->value);

                if ($value !== '' && in_array($event, PrismaPHPSettings::$htmlEvents, true)) {
                    $el->setAttribute("pp-original-on{$event}", $value);
                }

                $el->removeAttribute($name);
            }
        }

        $body = $fragDom->getElementsByTagName('body')[0] ?? null;

        return $body instanceof DOMElement
            ? self::innerXml($body)
            : self::innerXml($fragDom);
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

        if (!isset(self::$reflections[$className])) {
            $rc = new ReflectionClass($className);
            self::$reflections[$className]      = $rc;
            self::$constructors[$className]     = $rc->getConstructor();
            self::$publicProperties[$className] = array_filter(
                $rc->getProperties(ReflectionProperty::IS_PUBLIC),
                fn(ReflectionProperty $p) => ! $p->isStatic()
            );
        }

        $ref  = self::$reflections[$className];
        $ctor = self::$constructors[$className];
        $inst = $ref->newInstanceWithoutConstructor();

        foreach (self::$publicProperties[$className] as $prop) {
            $name = $prop->getName();
            if (array_key_exists($name, $attributes)) {
                $inst->$name = $attributes[$name];
            }
        }

        if ($ctor) {
            $ctor->invoke($inst, $attributes);
        }

        return $inst;
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
            if ($k === 'children') {
                continue;
            }
            $pairs[] = sprintf(
                '%s="%s"',
                $k,
                htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            );
        }
        $attrStr = $pairs ? ' ' . implode(' ', $pairs) : '';

        return in_array(strtolower($tag), self::$selfClosingTags, true)
            ? "<{$tag}{$attrStr} />"
            : "<{$tag}{$attrStr}>{$attrs['children']}</{$tag}>";
    }
}
