<?php

namespace Lib\PHPX;

use Lib\PHPX\IPHPX;
use Lib\PHPX\TwMerge;
use Lib\PrismaPHPSettings;

class PHPX implements IPHPX
{
    /**
     * @var array<string, mixed> The properties or attributes passed to the component.
     */
    protected array $props;

    /**
     * @var mixed The children elements or content to be rendered within the component.
     */
    public mixed $children;

    /**
     * @var string The CSS class for custom styling.
     */
    protected string $class;

    /**
     * @var array<string, mixed> The array representation of the HTML attributes.
     */
    protected array $attributesArray = [];

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
     * This method merges the provided classes, which can be either strings or arrays of strings,
     * with the component's `$class` property. It uses the `Utils::mergeClasses` method to ensure
     * that the resulting CSS class string is optimized, with duplicate or conflicting classes removed.
     *
     * ### Features:
     * - Accepts multiple arguments as strings or arrays of strings.
     * - Automatically merges the provided classes with `$this->class`.
     * - Ensures the final CSS class string is well-formatted and free of conflicts.
     *
     * @param string|array ...$classes The CSS classes to be merged. Each argument can be a string or an array of strings.
     * @return string A single CSS class string with the merged and optimized classes, including `$this->class`.
     */
    protected function getMergeClasses(string|array ...$classes): string
    {
        return PrismaPHPSettings::$option->tailwindcss ? TwMerge::mergeClasses($classes, $this->class) : $this->mergeClasses($classes, $this->class);
    }

    /**
     * Merges multiple CSS class strings or arrays of CSS class strings into a single, optimized CSS class string.
     *
     * @param string|array ...$classes The CSS classes to be merged.
     * @return string A single CSS class string with duplicates resolved.
     */
    private function mergeClasses(string|array ...$classes): string
    {
        $classSet = [];

        foreach ($classes as $class) {
            $classList = is_array($class) ? $class : [$class];
            foreach ($classList as $item) {
                if (!empty(trim($item))) {
                    $splitClasses = preg_split("/\s+/", $item);
                    foreach ($splitClasses as $individualClass) {
                        $classSet[$individualClass] = true;
                    }
                }
            }
        }

        return implode(" ", array_keys($classSet));
    }

    /**
     * Generates and returns a string of HTML attributes from the provided props.
     * Excludes 'class' and 'children' props from being added as attributes.
     * Prioritizes attributes from `$this->props` if duplicates are found in `$params`.
     *
     * @param array $params Optional additional attributes to merge with props.
     *
     * @return string The generated HTML attributes as a space-separated string.
     */
    protected function getAttributes(array $params = []): string
    {
        // Filter out 'class' and 'children' props
        $filteredProps = array_filter(
            $this->props,
            function ($key) {
                return !in_array($key, ["class", "children"]);
            },
            ARRAY_FILTER_USE_KEY
        );

        // Merge attributes, prioritizing props in case of duplicates
        $attributes = array_merge($params, $filteredProps);

        // Build the attributes string by escaping keys and values
        $attributeStrings = [];
        foreach ($attributes as $key => $value) {
            $escapedKey = htmlspecialchars($key, ENT_QUOTES, "UTF-8");
            $escapedValue = htmlspecialchars(
                (string) $value,
                ENT_QUOTES,
                "UTF-8"
            );
            $attributeStrings[] = "$escapedKey='$escapedValue'";
        }

        $this->attributesArray = $attributes;
        return implode(" ", $attributeStrings);
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
