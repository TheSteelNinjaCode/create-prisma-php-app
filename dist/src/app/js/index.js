/**
 * Description placeholder
 *
 * @param {*} func
 * @param {*} wait
 * @param {*} immediate
 * @returns {(...args: {}) => void}
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
 * Description placeholder
 *
 * @async
 * @param {{ className: any; methodName: any; params?: {}; }} param0
 * @param {*} param0.className
 * @param {*} param0.methodName
 * @param {{}} [param0.params={}]
 * @returns {unknown}
 */
async function fetchApi({ className, methodName, params = {} }) {
  // Construct the request body with provided parameters
  let requestBody = {
    className: className,
    methodName: methodName,
    params: JSON.stringify(params),
  };

  // Return the fetch promise to the caller
  const response = await fetch(`${baseUrl}api/api.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams(requestBody),
  });
  if (!response.ok) {
    // If the response is not ok, reject the promise
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  if (data.error) {
    // If the API returned an error, reject the promise
    throw new Error(data.error);
  }
  return data;
  // Note: No catch here, let the caller handle any errors
}

/**
 * Description placeholder
 *
 * @param {*} text
 * @param {*} btnElement
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
 * Description placeholder
 *
 * @param {*} btnElement
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
 * Description placeholder
 *
 * @class StateManager
 * @typedef {StateManager}
 */
class StateManager {
  static instance = null;

  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  /**
   * Description placeholder
   *
   * @static
   * @param {{}} [initialState={}]
   * @returns {*}
   */
  static getInstance(initialState = {}) {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager(initialState);
      StateManager.instance.loadState(); // Load state immediately after instance creation
    }
    return StateManager.instance;
  }

  /**
   * Description placeholder
   *
   * @param {*} update
   */
  setState(update) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Description placeholder
   *
   * @param {*} listener
   * @returns {() => any}
   */
  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.state); // Immediately invoke the listener with the current state
    return () =>
      (this.listeners = this.listeners.filter((l) => l !== listener));
  }

  saveState() {
    localStorage.setItem("appState", JSON.stringify(this.state));
  }

  loadState() {
    const state = localStorage.getItem("appState");
    if (state) {
      this.state = JSON.parse(state);
      this.listeners.forEach((listener) => listener(this.state));
    }
  }

  /**
   * Description placeholder
   * Reset the state to its initial value and optionally clear it from localStorage
   * @param {boolean} [clearFromStorage=false]
   */
  resetState(clearFromStorage = false) {
    this.state = {}; // Reset the state to an empty object or a default state if you prefer
    this.listeners.forEach((listener) => listener(this.state));
    if (clearFromStorage) {
      localStorage.removeItem("appState"); // Clear the state from localStorage
    }
  }
}

// This creates the instance and automatically loads the state if available
const store = StateManager.getInstance({});
