/**
 * Debounces a function to limit the rate at which it is called.
 *
 * The debounced function will postpone its execution until after the specified wait time
 * has elapsed since the last time it was invoked. If `immediate` is `true`, the function
 * will be called at the beginning of the wait period instead of at the end.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} [wait=300] - The number of milliseconds to wait before invoking the function.
 * @param {boolean} [immediate=false] - If `true`, the function is invoked immediately on the leading edge.
 * @returns {Function} - Returns the debounced version of the original function.
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout;

  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }, wait);

    if (immediate && !timeout) {
      func.apply(context, args);
    }
  };
}

/**
 * Copies text to the clipboard.
 *
 * @param {string} text - The text to copy.
 * @param {HTMLElement} btnElement - The button element that triggered the copy action.
 */
function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(
    function () {
      // Clipboard successfully set
      const icon = btnElement.querySelector("i");
      if (icon) {
        icon.className = "fa-regular fa-paste"; // Change to paste icon
      }
      // Set a timeout to change the icon back to copy after 2000 milliseconds
      setTimeout(function () {
        if (icon) {
          icon.className = "fa-regular fa-copy"; // Change back to copy icon
        }
      }, 2000); // 2000 milliseconds delay
    },
    function () {
      // Clipboard write failed
      alert("Failed to copy command to clipboard");
    }
  );
}

/**
 * Copies code to the clipboard.
 *
 * @param {HTMLElement} btnElement - The button element that triggered the copy action.
 */
function copyCode(btnElement) {
  // Assuming your code block is uniquely identifiable close to your button
  const codeBlock = btnElement
    .closest(".mockup-code")
    .querySelector("pre code");
  const textToCopy = codeBlock ? codeBlock.textContent : ""; // Get the text content of the code block

  // Use your existing copyToClipboard function
  copyToClipboard(textToCopy, btnElement);
}

if (
  typeof RequestApi === "undefined" &&
  typeof StateManager === "undefined" &&
  typeof HXConnector === "undefined"
) {
  /**
   * Represents a HTTP request.
   */
  class RequestApi {
    static instance = null;

    /**
     * The constructor is now private. To ensure it's not accessible from outside,
     * you can throw an error if someone tries to instantiate it directly
     * (though JavaScript does not have true private constructors).
     */
    constructor(baseURL = window.location.origin) {
      this.baseURL = baseURL;
    }

    /**
     * Static method to get instance of RequestApi.
     *
     * @param {string} [baseURL=window.location.origin] - The base URL for the request.
     * @returns {RequestApi} The singleton instance of the RequestApi.
     */
    static getInstance(baseURL = window.location.origin) {
      if (!RequestApi.instance) {
        RequestApi.instance = new RequestApi(baseURL);
      }
      return RequestApi.instance;
    }

    /**
     * Sends a HTTP request.
     *
     * @async
     * @param {string} method - The HTTP method.
     * @param {string} url - The URL to send the request to.
     * @param {*} [data=null] - The data to send with the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    async request(method, url, data = null, headers = {}) {
      let fullUrl = `${this.baseURL}${url}`;
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...headers,
        },
      };

      if (data) {
        if (method === "GET") {
          const params = new URLSearchParams(data).toString();
          fullUrl += `?${params}`;
        } else if (method !== "HEAD" && method !== "OPTIONS") {
          options.body = JSON.stringify(data);
        }
      }

      try {
        const response = await fetch(fullUrl, options);
        if (method === "HEAD") {
          return response.headers;
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (error) {
        throw error;
      }
    }

    /**
     * Sends a GET request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {*} [params] - The parameters to include in the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    get(url, params, headers) {
      return this.request("GET", url, params, headers);
    }

    /**
     * Sends a POST request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {*} data - The data to send with the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    post(url, data, headers) {
      return this.request("POST", url, data, headers);
    }

    /**
     * Sends a PUT request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {*} data - The data to send with the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    put(url, data, headers) {
      return this.request("PUT", url, data, headers);
    }

    /**
     * Sends a DELETE request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {*} data - The data to send with the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    delete(url, data, headers) {
      return this.request("DELETE", url, data, headers);
    }

    /**
     * Sends a PATCH request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {*} data - The data to send with the request.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response data.
     */
    patch(url, data, headers) {
      return this.request("PATCH", url, data, headers);
    }

    /**
     * Sends a HEAD request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the response headers.
     */
    head(url, headers) {
      return this.request("HEAD", url, null, headers);
    }

    /**
     * Sends an OPTIONS request.
     *
     * @param {string} url - The URL to send the request to.
     * @param {Object} [headers={}] - The headers to include in the request.
     * @returns {Promise<unknown>} - A promise that resolves to the options available.
     */
    options(url, headers) {
      return this.request("OPTIONS", url, null, headers);
    }
  }

  /**
   * Manages the application state.
   */
  class StateManager {
    static instance = null;

    /**
     * Creates a new StateManager instance.
     *
     * @param {{}} [initialState={}] - The initial state.
     */
    constructor(initialState = {}) {
      this.state = initialState;
      this.listeners = [];
    }

    /**
     * Gets the singleton instance of StateManager.
     *
     * @static
     * @param {{}} [initialState={}] - The initial state.
     * @returns {StateManager} - The StateManager instance.
     */
    static getInstance(initialState = {}) {
      if (!StateManager.instance) {
        StateManager.instance = new StateManager(initialState);
        StateManager.instance.loadState(); // Load state immediately after instance creation
      }
      return StateManager.instance;
    }

    /**
     * Sets the state.
     *
     * @param {*} update - The state update.
     * @param {boolean} [saveToStorage=false] - Whether to save the state to localStorage.
     */
    setState(update, saveToStorage = false) {
      this.state = { ...this.state, ...update };
      this.listeners.forEach((listener) => listener(this.state));
      if (saveToStorage) {
        this.saveState();
      }
    }

    /**
     * Subscribes to state changes.
     *
     * @param {*} listener - The listener function.
     * @returns {Function} - A function to unsubscribe the listener.
     */
    subscribe(listener) {
      this.listeners.push(listener);
      listener(this.state); // Immediately invoke the listener with the current state
      return () =>
        (this.listeners = this.listeners.filter((l) => l !== listener));
    }

    /**
     * Saves the state to localStorage.
     */
    saveState() {
      localStorage.setItem("appState", JSON.stringify(this.state));
    }

    /**
     * Loads the state from localStorage.
     */
    loadState() {
      const state = localStorage.getItem("appState");
      if (state) {
        this.state = JSON.parse(state);
        this.listeners.forEach((listener) => listener(this.state));
      }
    }

    /**
     * Resets the state to its initial value.
     *
     * @param {boolean} [clearFromStorage=false] - Whether to clear the state from localStorage.
     */
    resetState(clearFromStorage = false) {
      this.state = {}; // Reset the state to an empty object or a default state if you prefer
      this.listeners.forEach((listener) => listener(this.state));
      if (clearFromStorage) {
        localStorage.removeItem("appState"); // Clear the state from localStorage
      }
    }
  }

  /**
   * Connects elements with `hx-trigger` and `hx-vals` attributes to update
   * their values and attributes based on the specified triggers.
   * Also handles form events based on the `hx-form` attribute.
   * This class is a singleton.
   **/
  class HXConnector {
    // Static property to hold the single instance
    static instance = null;

    // Private constructor to prevent direct instantiation
    constructor() {
      if (HXConnector.instance) {
        return HXConnector.instance;
      }

      this.init();
      HXConnector.instance = this;
    }

    // Static method to get the single instance
    static getInstance() {
      if (!HXConnector.instance) {
        HXConnector.instance = new HXConnector();
      }
      return HXConnector.instance;
    }

    // Initializes the HXConnector by connecting attributes of elements with
    // `hx-trigger` and `hx-vals` attributes, and sets up an event listener to handle
    // new elements added after HTMX swaps.
    init() {
      this.connectAttributes(document.querySelectorAll("[hx-trigger][hx-vals]"));
      this.handleFormEvents(document.querySelectorAll("[hx-form]"));

      document.body.addEventListener("htmx:afterSwap", (event) => {
        this.connectAttributes(
          event.detail.target.querySelectorAll("[hx-trigger][hx-vals]")
        );
        this.handleFormEvents(event.detail.target.querySelectorAll("[hx-form]"));
      });
    }

    // Connects attributes of the provided elements based on the values specified
    // in their `hx-vals` attributes and attaches event listeners based on `hx-trigger`.
    connectAttributes(elements) {
      elements.forEach((element) => {
        const event = element.getAttribute("hx-trigger");
        element.addEventListener(event, (el) => {
          const targetElement = el.target.closest("[hx-trigger]");
          if (targetElement) {
            const values = JSON.parse(targetElement.getAttribute("hx-vals"));

            // Process targets
            if (values.targets) {
              values.targets.forEach((target) => {
                const targetElem = document.getElementById(target.id);
                if (targetElem) {
                  this.updateElementValues(targetElem, target.value);
                }
              });
            }

            // Process attributes
            if (values.attributes) {
              values.attributes.forEach((attributeSet) => {
                const element = document.getElementById(attributeSet.id);
                if (element) {
                  Object.keys(attributeSet.attributes).forEach((attr) => {
                    const value = attributeSet.attributes[attr];
                    switch (attr) {
                      case "class":
                        this.updateClassAttribute(element, value);
                        break;
                      case "add":
                        element.setAttribute(value, "");
                        break;
                      case "remove":
                        element.removeAttribute(value);
                        break;
                      default:
                        element.setAttribute(attr, value);
                    }
                  });
                }
              });
            }

            // Register swaps to be processed after the htmx request completes
            if (values.swaps) {
              document.addEventListener(
                "htmx:afterRequest",
                () => {
                  values.swaps.forEach((swap) => {
                    const element = document.getElementById(swap.id);
                    if (element) {
                      Object.keys(swap.attributes).forEach((attr) => {
                        const value = swap.attributes[attr];
                        switch (attr) {
                          case "class":
                            this.updateClassAttribute(element, value);
                            break;
                          case "add":
                            element.setAttribute(value, "");
                            break;
                          case "remove":
                            element.removeAttribute(value);
                            break;
                          default:
                            element.setAttribute(attr, value);
                        }
                      });
                    }
                  });
                },
                {
                  once: true,
                }
              );
            }
          }
        });
      });
    }

    // Handles form events for the provided forms based on their `hx-form` attribute.
    handleFormEvents(forms) {
      forms.forEach((form) => {
        const eventAttr = form.getAttribute("hx-form");
        if (eventAttr) {
          const [eventType, functionName] = eventAttr.split(":");

          form.addEventListener(`htmx:${eventType}`, (event) => {
            switch (functionName) {
              case "reset":
                if (event.detail.successful) {
                  form.reset();
                }
                break;

              case "clear":
                if (event.detail.successful) {
                  this.clearForm(form);
                }
                break;

              case "disable":
                this.toggleForm(form, true);
                break;

              case "enable":
                this.toggleForm(form, false);
                break;

              // Add more cases as needed

              default:
                console.warn(`Unhandled function name: ${functionName}`);
                break;
            }
          });
        }
      });
    }

    // Clears the input values of the specified form.
    clearForm(form) {
      const inputs = form.querySelectorAll("input, textarea, select");
      inputs.forEach((input) => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
    }

    // Toggles the disabled state of the specified form's inputs.
    toggleForm(form, state) {
      const inputs = form.querySelectorAll("input, textarea, select, button");
      inputs.forEach((input) => {
        input.disabled = state;
      });
    }

    // Updates the values of the specified element based on its tag name and type.
    updateElementValues(element, value) {
      const tagName = element.tagName;
      const inputType = element.type;

      if (tagName === "INPUT" || tagName === "TEXTAREA") {
        if (inputType === "checkbox") {
          element.checked = value;
        } else {
          element.value = value;
        }
      } else {
        element.textContent = value;
      }
    }

    // Updates the class attribute of the specified element. Class names starting
    // with a hyphen (`-`) are removed, others are added.
    updateClassAttribute(element, className) {
      const classNames = className.split(" ");
      classNames.forEach((name) => {
        if (name.startsWith("-")) {
          element.classList.remove(name.substring(1));
        } else {
          element.classList.add(name);
        }
      });
    }
  }

  let store = null;
  let api = null;
  let hxConnector = null;

  // Function to initialize instances
  function initializeInstances() {
    store = StateManager.getInstance();
    api = RequestApi.getInstance();
    hxConnector = HXConnector.getInstance();
  }

  // Initialize instances on initial page load
  document.addEventListener("DOMContentLoaded", function () {
    initializeInstances();

    // Ensure document.body exists before attaching the event listener
    if (document.body) {
      document.body.addEventListener("htmx:afterOnLoad", function () {
        initializeInstances();
      });
    }
  });
}
