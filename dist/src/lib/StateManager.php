<?php

namespace Lib;

/**
 * Manages the application state.
 */
class StateManager
{
    private $state;
    private $listeners;

    /**
     * Constructs a new StateManager instance.
     *
     * @param array $initialState The initial state of the application.
     */
    public function __construct($initialState = [])
    {
        $this->state = $initialState;
        $this->listeners = [];
        $this->loadState();
    }

    /**
     * Retrieves the current state of the application.
     *
     * @param string|null $key The key of the state value to retrieve. If null, returns the entire state.
     * @return mixed|null The state value corresponding to the given key, or null if the key is not found.
     */
    public function getState($key = null)
    {
        if ($key === null) {
            return $this->state;
        }

        return $this->state[$key] ?? null;
    }

    /**
     * Updates the application state with the given update.
     *
     * @param array $update The state update to apply.
     * @param bool $saveToStorage Whether to save the updated state to storage.
     */
    public function setState($update, $saveToStorage = false)
    {
        $this->state = array_merge($this->state, $update);
        foreach ($this->listeners as $listener) {
            call_user_func($listener, $this->state);
        }
        if ($saveToStorage) {
            $this->saveState();
        }
    }

    /**
     * Subscribes a listener to state changes.
     *
     * @param callable $listener The listener function to subscribe.
     * @return callable A function that can be called to unsubscribe the listener.
     */
    public function subscribe($listener)
    {
        $this->listeners[] = $listener;
        call_user_func($listener, $this->state);
        return function () use ($listener) {
            $this->listeners = array_filter($this->listeners, function ($l) use ($listener) {
                return $l !== $listener;
            });
        };
    }

    /**
     * Saves the current state to storage.
     */
    private function saveState()
    {
        $_SESSION['appState'] = json_encode($this->state);
    }

    /**
     * Loads the state from storage, if available.
     */
    private function loadState()
    {
        if (isset($_SESSION['appState'])) {
            $this->state = json_decode($_SESSION['appState'], true);
            foreach ($this->listeners as $listener) {
                call_user_func($listener, $this->state);
            }
        }
    }

    /**
     * Resets the application state.
     *
     * @param bool $clearFromStorage Whether to clear the state from storage.
     */
    public function resetState($clearFromStorage = false)
    {
        $this->state = [];
        foreach ($this->listeners as $listener) {
            call_user_func($listener, $this->state);
        }
        if ($clearFromStorage) {
            unset($_SESSION['appState']);
        }
    }
}
