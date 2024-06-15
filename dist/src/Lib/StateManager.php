<?php

namespace Lib;

/**
 * Manages the application state.
 */
class StateManager
{
    private const APP_STATE = 'app_state_F989A';
    private $state;
    private $listeners;

    /**
     * Initializes a new instance of the StateManager class.
     *
     * @param array $initialState The initial state of the application.
     */
    public function __construct(array $initialState = [])
    {
        global $isWire;

        $this->state = $initialState;
        $this->listeners = [];
        $this->loadState();

        if (!$isWire) $this->resetState();
    }

    /**
     * Retrieves the current state of the application.
     *
     * @param string|null $key The key of the state value to retrieve. If null, returns the entire state.
     * @return mixed|null The state value corresponding to the given key, or null if the key is not found.
     */
    public function getState($key = null): mixed
    {
        if ($key === null) {
            return new \ArrayObject($this->state, \ArrayObject::ARRAY_AS_PROPS);
        }

        $value = $this->state[$key] ?? null;
        return is_array($value) ? new \ArrayObject($value, \ArrayObject::ARRAY_AS_PROPS) : $value;
    }

    /**
     * Updates the application state with the given update.
     *
     * @param string|array $key The key of the state value to update, or an array of key-value pairs to update multiple values.
     * @param mixed|null $value The value to update the state with, ignored if $key is an array.
     */
    public function setState($key, $value = null): void
    {
        $update = is_array($key) ? $key : [$key => $value];
        $this->state = array_merge($this->state, $update);
        $this->notifyListeners();
        $this->saveState();
    }

    /**
     * Subscribes a listener to state changes.
     *
     * @param callable $listener The listener function to subscribe.
     * @return callable A function that can be called to unsubscribe the listener.
     */
    public function subscribe(callable $listener): callable
    {
        $this->listeners[] = $listener;
        $listener($this->state); // Immediate call with current state
        return function () use ($listener) {
            $this->listeners = array_filter($this->listeners, fn ($l) => $l !== $listener);
        };
    }

    /**
     * Saves the current state to storage.
     */
    private function saveState(): void
    {
        $_SESSION[self::APP_STATE] = json_encode($this->state);
    }

    /**
     * Loads the state from storage, if available.
     */
    private function loadState(): void
    {
        if (isset($_SESSION[self::APP_STATE])) {
            $loadedState = json_decode($_SESSION[self::APP_STATE], true);
            if ($loadedState !== null) {
                $this->state = $loadedState;
                $this->notifyListeners();
            }
        }
    }

    /**
     * Resets the application state to an empty array.
     */
    public function resetState(): void
    {
        $this->state = [];
        $this->notifyListeners();
        $this->saveState();
    }

    /**
     * Notifies all listeners of state changes.
     */
    private function notifyListeners(): void
    {
        foreach ($this->listeners as $listener) {
            $listener($this->state);
        }
    }
}
