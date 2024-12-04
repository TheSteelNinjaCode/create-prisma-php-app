<?php

namespace Lib\PHPX;

use Lib\PHPX\IPHPX;
use Lib\PHPX\Utils;

class PHPX implements IPHPX
{
    /**
     * @var array<string, mixed> The properties or attributes passed to the component.
     */
    protected array $props;

    /**
     * @var mixed The children elements or content to be rendered within the component.
     */
    protected mixed $children;

    /**
     * @var string The CSS class for custom styling.
     */
    protected string $class;

    /**
     * Constructor to initialize the component with the given properties.
     * 
     * @param array<string, mixed> $props Optional properties to customize the component.
     */
    public function __construct(array $props = [])
    {
        $this->props = $props;
        $this->children = $props['children'] ?? '';
        $this->class = $props['class'] ?? '';
    }

    /**
     * Registers or initializes any necessary components or settings. (Placeholder method).
     * 
     * @param array<string, mixed> $props Optional properties to customize the initialization.
     */
    public static function init(array $props = []): void
    {
        // Register the component or any necessary initialization
    }

    /**
     * Combines and returns the CSS classes for the component.
     *
     * This method merges the optional base CSS class with additional classes
     * defined in the component's `$class` property. If no base class is provided,
     * only the component's `$class` property will be used. It ensures that there 
     * are no duplicate classes and the classes are properly formatted.
     *
     * @param string|null $baseClass The optional base CSS class to be merged. Defaults to `null`.
     * @return string The merged CSS class string.
     */
    protected function getMergeClasses(?string $baseClass = null): string
    {
        return Utils::mergeClasses($baseClass, $this->class);
    }

    /**
     * Generates and returns a string of HTML attributes from the provided props.
     * Excludes 'class' and 'children' props from being added as attributes.
     * 
     * @return string The generated HTML attributes.
     */
    protected function getAttributes(): string
    {
        // Filter out 'class' and 'children' props
        $filteredProps = array_filter($this->props, function ($key) {
            return !in_array($key, ['class', 'children']);
        }, ARRAY_FILTER_USE_KEY);

        // Build attributes string by escaping keys and values
        $attributes = [];
        foreach ($filteredProps as $key => $value) {
            $escapedKey = htmlspecialchars($key, ENT_QUOTES, 'UTF-8');
            $escapedValue = htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
            $attributes[] = "$escapedKey='$escapedValue'";
        }

        return implode(' ', $attributes);
    }

    /**
     * Renders the component as an HTML string with the appropriate classes and attributes.
     * Also, allows for dynamic children rendering if a callable is passed.
     * 
     * @return string The final rendered HTML of the component.
     */
    public function render(): string
    {
        $attributes = $this->getAttributes();
        $class = $this->class;

        return <<<HTML
        <div class="$class" $attributes>{$this->children}</div>
        HTML;
    }

    /**
     * Converts the object to its string representation by rendering it.
     *
     * @return string The rendered HTML output of the component.
     */
    public function __toString(): string
    {
        return $this->render();
    }
}
