<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;
use PP\PHPX\TemplateCompiler;

/**
 * The server-deferred component-root contract, as the app depends on it.
 *
 * The final document wraps every outermost `[pp-component]` root inside
 * `<body>` in an inert `<template pp-component="...">`. The browser never
 * executes scripts or parses `{...}` placeholders inside a template, so
 * component scripts cannot run before the PulsePoint runtime module loads
 * ("pp is not defined") and raw placeholders cannot trigger bogus requests
 * or value coercion before hydration. `pp.mount()` materializes
 * `template[pp-component]` back into live DOM before scanning for roots.
 */
final class DeferComponentRootsTest extends TestCase
{
    private function document(string $bodyContent): string
    {
        return "<html>\n<head><title>t</title></head>\n<body>\n"
            . $bodyContent
            . "\n</body>\n</html>";
    }

    public function testWrapsRouteRootInInertTemplate(): void
    {
        $html = $this->document(
            '<div pp-component="page_abc123">'
            . '<p>Count: {count}</p>'
            . '<script>const [count, setCount] = pp.state(0);</script>'
            . '</div>'
        );

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertStringContainsString(
            '<template pp-component="page_abc123"><div pp-component="page_abc123">',
            $deferred
        );
        self::assertStringContainsString('</div></template>', $deferred);
        // The component script rides along inside the inert template, unchanged.
        self::assertStringContainsString(
            '<script>const [count, setCount] = pp.state(0);</script>',
            $deferred
        );
    }

    public function testOnlyOutermostBoundaryIsWrapped(): void
    {
        $html = $this->document(
            '<div pp-component="layout_1">'
            . '<div pp-component="page_2"><p>{msg}</p></div>'
            . '</div>'
        );

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertSame(1, substr_count($deferred, '<template pp-component='));
        self::assertStringContainsString('<template pp-component="layout_1">', $deferred);
        // The nested boundary stays a plain element inside the inert content.
        self::assertStringContainsString('<div pp-component="page_2">', $deferred);
    }

    public function testWrapsFooterComponentScript(): void
    {
        $html = $this->document(
            '<div pp-component="page_1"><p>hi</p></div>'
            . '<script pp-component="s9footer">pp.state(1);</script>'
        );

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertStringContainsString(
            '<template pp-component="s9footer"><script pp-component="s9footer">pp.state(1);</script></template>',
            $deferred
        );
    }

    public function testSiblingBoundariesAreEachWrapped(): void
    {
        $html = $this->document(
            '<main><div pp-component="a"><span>x</span></div>'
            . '<div pp-component="b"><span>y</span></div></main>'
        );

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertStringContainsString('<template pp-component="a"><div pp-component="a">', $deferred);
        self::assertStringContainsString('<template pp-component="b"><div pp-component="b">', $deferred);
    }

    public function testEscapedBraceEntitiesGainOneEncodingLayer(): void
    {
        // The browser's parse of the template content consumes one entity
        // layer; the extra `&amp;` keeps the escape visible to the runtime.
        $html = $this->document(
            '<div pp-component="page_1"><code>&#123;literal&#125;</code>'
            . '<script>const s = "&#123;";</script></div>'
        );

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertStringContainsString('<code>&amp;#123;literal&amp;#125;</code>', $deferred);
        // Script content is raw text in the template parse — left untouched.
        self::assertStringContainsString('const s = "&#123;";', $deferred);
    }

    public function testHeadContentIsNeverWrapped(): void
    {
        $html = "<html>\n<head><meta name=\"x\" pp-component=\"nope\"></head>\n<body>\n"
            . '<div pp-component="page_1"><p>hi</p></div>'
            . "\n</body>\n</html>";

        $deferred = TemplateCompiler::deferComponentRoots($html);

        self::assertStringNotContainsString('<template pp-component="nope">', $deferred);
        self::assertStringContainsString('<template pp-component="page_1">', $deferred);
    }

    public function testAlreadyDeferredTemplateIsLeftAlone(): void
    {
        $html = $this->document(
            '<template pp-component="page_1"><div pp-component="page_1"><p>hi</p></div></template>'
        );

        self::assertSame($html, TemplateCompiler::deferComponentRoots($html));
    }

    public function testDocumentWithoutBoundariesIsUnchanged(): void
    {
        $html = $this->document('<div><p>plain</p></div>');

        self::assertSame($html, TemplateCompiler::deferComponentRoots($html));
    }

    public function testUnbalancedBoundaryMarkupLeavesDocumentUntouched(): void
    {
        $html = $this->document('<div pp-component="page_1"><p>never closed');

        self::assertSame($html, TemplateCompiler::deferComponentRoots($html));
    }
}
