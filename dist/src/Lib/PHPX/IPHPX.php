<?php

namespace Lib\PHPX;

/**
 * Interface IPHPX
 * 
 * The interface for the PHPX component classes.
 */

interface IPHPX
{
    /**
     * Constructor to initialize the component with the given properties.
     * 
     * @param array<string, mixed> $props Optional properties to customize the component.
     */
    public function __construct(array $props = []);

    /**
     * Registers or initializes any necessary components or settings. (Placeholder method).
     * 
     * @param array<string, mixed> $props Optional properties to customize the component.
     */
    public static function init(array $props = []): void;

    /**
     * Renders the component with the given properties and children.
     * 
     * @return string The rendered HTML content.
     */
    public function render(): string;
}
