<?php

namespace Lib\PHPX;

use Lib\PHPX\IPHPX;
use Lib\PHPX\TwMerge;

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
     * @param string $baseClass The optional base CSS class to be merged. Defaults to an empty string.
     * @return string The merged CSS class string.
     */
    protected function getMergeClasses(string $baseClass = ''): string
    {
        return TwMerge::mergeClasses($baseClass, $this->class);
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
        $class = $this->getMergeClasses();

        return <<<HTML
        <div class="$class" $attributes>{$this->children}</div>
        HTML;
    }

    /**
     * Converts the object to its string representation by rendering the component.
     *
     * This method allows the object to be used directly in string contexts, such as
     * when echoing or concatenating, by automatically invoking the `render()` method.
     * If an exception occurs during rendering, it safely returns an empty string
     * to prevent runtime errors, ensuring robustness in all scenarios.
     *
     * @return string The rendered HTML output of the component, or an empty string if rendering fails.
     */
    public function __toString(): string
    {
        try {
            return $this->render();
        } catch (\Exception) {
            return ''; // Return an empty string or a fallback message in case of errors
        }
    }
}
