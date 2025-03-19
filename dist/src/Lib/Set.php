<?php

declare(strict_types=1);

namespace Lib;

final class Set
{
    private array $items = [];

    /**
     * Adds a value to the set.
     *
     * If the value is not already present, it is added.
     *
     * @param mixed $value The value to add.
     * @return void
     */
    public function add(mixed $value): void
    {
        $key = $this->getKey($value);
        if (!isset($this->items[$key])) {
            $this->items[$key] = $value;
        }
    }

    /**
     * Checks whether the set contains a given value.
     *
     * @param mixed $value The value to check.
     * @return bool True if the value exists in the set, false otherwise.
     */
    public function has(mixed $value): bool
    {
        return isset($this->items[$this->getKey($value)]);
    }

    /**
     * Removes a value from the set.
     *
     * @param mixed $value The value to remove.
     * @return void
     */
    public function delete(mixed $value): void
    {
        unset($this->items[$this->getKey($value)]);
    }

    /**
     * Clears all values from the set.
     *
     * @return void
     */
    public function clear(): void
    {
        $this->items = [];
    }

    /**
     * Retrieves all values from the set, preserving insertion order.
     *
     * @return array The array of values stored in the set.
     */
    public function values(): array
    {
        return array_values($this->items);
    }

    /**
     * Returns the number of values in the set.
     *
     * @return int The size of the set.
     */
    public function size(): int
    {
        return count($this->items);
    }

    /**
     * Generates a unique key for the given value.
     *
     * - For objects, it uses spl_object_id.
     * - For arrays, it uses md5(serialize($value)) to create a unique string.
     * - For other types (scalars), the value itself is used as the key.
     *
     * @param mixed $value The value for which to generate a key.
     * @return string|int The unique key.
     */
    private function getKey(mixed $value): string|int
    {
        if (is_object($value)) {
            return spl_object_id($value);
        } elseif (is_array($value)) {
            return md5(serialize($value));
        }
        return $value;
    }
}
