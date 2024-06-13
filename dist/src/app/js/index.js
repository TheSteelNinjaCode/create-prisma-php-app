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

"use strict";var eventAttributes=["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"];function attachWireFunctionEvents(){document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((e=>{e instanceof HTMLAnchorElement&&e.addEventListener("click",handleAnchorTag),eventAttributes.forEach((t=>{const n=e.getAttribute(t),o=t.slice(2);n&&(e.removeAttribute(t),e.addEventListener(o,(t=>{t.preventDefault();const{funcName:o,data:r}=parseCallback(e,n);if(o){const e=window[o];if("function"==typeof e)try{e(...r)}catch(e){}else handleUndefinedFunction(o,r)}})))}))}))}async function handleAnchorTag(e){const t=e.currentTarget,n=t.getAttribute("href"),o=t.getAttribute("target");if(!n||"_blank"===o||e.metaKey||e.ctrlKey)return;e.preventDefault();if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else try{history.pushState(null,"",n),window.dispatchEvent(new PopStateEvent("popstate",{state:null}))}catch(e){}}function updateDocumentContent(e){if(e.includes("<!DOCTYPE html>")){const t=(new DOMParser).parseFromString(e,"text/html");document.replaceChild(document.adoptNode(t.documentElement),document.documentElement),attachWireFunctionEvents()}else{const t=document.activeElement,n=t?.id||t?.name,o=t?.value,r=t?.selectionStart,a=t?.selectionEnd,c=(new DOMParser).parseFromString(e,"text/html");if(updateElementContent(document.body,c.body),n){const e=document.getElementById(n)||document.querySelector(`[name="${n}"]`);e instanceof HTMLInputElement&&(e.focus(),e.value=o||"",null!==r&&null!==a&&e.setSelectionRange(r,a))}attachWireFunctionEvents()}}function updateElementContent(e,t){e.innerHTML!==t.innerHTML&&(e.innerHTML=t.innerHTML),Array.from(t.attributes).forEach((t=>{e.setAttribute(t.name,t.value)}))}function parseCallback(e,t){let n={};if(e instanceof HTMLFormElement){const t=new FormData(e);n=Object.fromEntries(t.entries())}else e instanceof HTMLInputElement&&(e.name?"checkbox"===e.type||"radio"===e.type?n[e.name]=e.checked:n[e.name]=e.value:"checkbox"===e.type||"radio"===e.type?n.value=e.checked:n.value=e.value);const o=t.match(/(\w+)\(([^)]*)\)/);if(o){const e=o[1];let t=[];return o[2]&&(t=o[2].split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((e=>e.trim())),t=t.map((e=>{try{const t=e.replace(/'/g,'"');return JSON.parse(t)}catch{return e}}))),t.forEach((e=>{n="object"==typeof e&&null!==e?{...n,...e}:{...n,args:t}})),{funcName:e,data:n}}return{funcName:t,data:n}}function handleUndefinedFunction(e,t){const n={callback:e,...t},o={method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(n)},r={method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest",HTTP_PPHP_WIRE_REQUEST:"true"}},a=async e=>{const t=await fetch(window.location.pathname,e);return await t.text()};let c="";a(o).then((e=>(""===c&&(c=e),a(r)))).then((e=>{updateDocumentContent(mergeAndReplaceDuplicates(c,e))})).catch((e=>{}))}function mergeAndReplaceDuplicates(e,t){const{html:n,scripts:o}=extractScripts(e),{html:r,scripts:a}=extractScripts(t),c=(new DOMParser).parseFromString(r,"text/html"),i=document.createElement("div");i.innerHTML=n,mergeElementsCompletely(i,c.body);const s=i.innerHTML;return mergeScripts(o,a)+s}function mergeElementsCompletely(e,t){Array.from(e.attributes).forEach((t=>e.removeAttribute(t.name))),Array.from(t.attributes).forEach((t=>e.setAttribute(t.name,t.value))),t.textContent&&!t.children.length&&(e.textContent=t.textContent);const n=Array.from(e.children),o=Array.from(t.children);n.forEach((t=>e.removeChild(t))),o.forEach((t=>e.appendChild(t.cloneNode(!0))))}function extractScripts(e){let t="",n=e;return n=n.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,(e=>(t+=e,""))),{html:n,scripts:t}}function mergeScripts(e,t){const n=new Set([...e.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi)||[],...t.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi)||[]]);return Array.from(n).join("\n")}document.addEventListener("DOMContentLoaded",(()=>{attachWireFunctionEvents()})),window.addEventListener("popstate",(async()=>{try{const e=await fetch(window.location.href,{headers:{"X-Requested-With":"XMLHttpRequest"}});updateDocumentContent(await e.text())}catch(e){}}));