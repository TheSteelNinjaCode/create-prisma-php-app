/**
 * Debounces a function to limit the rate at which it is called.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to wait before invoking the function.
 * @param {boolean} immediate - Whether to invoke the function immediately on the leading edge.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this,
      args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }, wait);
    if (immediate && !timeout) func.apply(context, args);
  };
}

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

const store = StateManager.getInstance();
const api = RequestApi.getInstance();
