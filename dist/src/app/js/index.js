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
  typeof StateManager === "undefined"
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

  let store = null;
  let api = null;

  // Function to initialize instances
  function initializeInstances() {
    store = StateManager.getInstance();
    api = RequestApi.getInstance();
  }

  // Initialize instances on initial page load
  document.addEventListener("DOMContentLoaded", function () {
    initializeInstances();
  });
}

"use strict";var eventAttributes=["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"];function attachWireFunctionEvents(){document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((t=>{t instanceof HTMLAnchorElement&&t.addEventListener("click",handleAnchorTag),eventAttributes.forEach((e=>{const n=t.getAttribute(e),o=e.slice(2);n&&(t.removeAttribute(e),t.addEventListener(o,(e=>{e.preventDefault();const{funcName:o,data:r}=parseCallback(t,n);if(o){const t=window[o];if("function"==typeof t)try{t(...r)}catch(t){}else handleUndefinedFunction(o,r)}})))}))}))}async function handleAnchorTag(t){const e=t.currentTarget,n=e.getAttribute("href"),o=e.getAttribute("target");if(!n||"_blank"===o||t.metaKey||t.ctrlKey)return;t.preventDefault();if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else try{history.pushState(null,"",n),window.dispatchEvent(new PopStateEvent("popstate",{state:null}))}catch(t){}}function updateDocumentContent(t){t.includes("<!DOCTYPE html>")?document.documentElement.innerHTML=t:document.body.innerHTML=t,attachWireFunctionEvents()}function parseCallback(t,e){let n={};if(t instanceof HTMLFormElement){const e=new FormData(t);n=Object.fromEntries(e.entries())}else t instanceof HTMLInputElement&&(t.name?"checkbox"===t.type||"radio"===t.type?n[t.name]=t.checked:n[t.name]=t.value:"checkbox"===t.type||"radio"===t.type?n.value=t.checked:n.value=t.value);const o=e.match(/(\w+)\(([^)]*)\)/);if(o){const t=o[1];let e=[];return o[2]&&(e=o[2].split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((t=>t.trim())),e=e.map((t=>{try{const e=t.replace(/'/g,'"');return JSON.parse(e)}catch{return t}}))),e.forEach((t=>{n="object"==typeof t&&null!==t?{...n,...t}:{...n,args:e}})),{funcName:t,data:n}}return{funcName:e,data:n}}function handleUndefinedFunction(t,e){const n={callback:t,...e},o={method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(n)},r={method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest",HTTP_PPHP_WIRE_REQUEST:"true"}},c=async t=>{const e=await fetch(window.location.pathname,t);return await e.text()};let a="";c(o).then((t=>(""===a&&(a=t),c(r)))).then((t=>{updateDocumentContent(mergeAndReplaceDuplicates(a,t))})).catch((t=>{}))}function mergeAndReplaceDuplicates(t,e){const{html:n,scripts:o}=extractScripts(t),{html:r,scripts:c}=extractScripts(e),a=(new DOMParser).parseFromString(r,"text/html"),i=document.createElement("div");i.innerHTML=n,mergeElementsCompletely(i,a.body);const s=i.innerHTML;return mergeScripts(o,c)+s}function mergeElementsCompletely(t,e){Array.from(t.attributes).forEach((e=>t.removeAttribute(e.name))),Array.from(e.attributes).forEach((e=>t.setAttribute(e.name,e.value))),e.textContent&&!e.children.length&&(t.textContent=e.textContent);const n=Array.from(t.children),o=Array.from(e.children);n.forEach((e=>t.removeChild(e))),o.forEach((e=>t.appendChild(e.cloneNode(!0))))}function extractScripts(t){let e="",n=t;return n=n.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,(t=>(e+=t,""))),{html:n,scripts:e}}function mergeScripts(t,e){const n=new Set([...t.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi)||[],...e.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi)||[]]);return Array.from(n).join("\n")}document.addEventListener("DOMContentLoaded",(()=>{attachWireFunctionEvents()})),window.addEventListener("popstate",(async()=>{try{const t=await fetch(window.location.href,{headers:{"X-Requested-With":"XMLHttpRequest"}});updateDocumentContent(await t.text())}catch(t){}}));