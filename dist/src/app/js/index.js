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
