var eventAttributesB6B56=["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"],stateA129A={checkedElements:new Set},responseDataDEAC2=null,store=null,isNavigatingA12E1=!1,redirectRegex3AE99=/redirect_7F834=(.+)/;function attachWireFunctionEvents(){handleHiddenAttribute();document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((e=>{if(handleAnchorTag(e),eventAttributesB6B56.forEach((t=>{const n=e.getAttribute(t),s=t.slice(2);n&&(e.removeAttribute(t),handleDebounce(e,s,n))})),e instanceof HTMLFormElement){const t=e.getAttribute("onsubmit");t&&(e.removeAttribute("onsubmit"),handleDebounce(e,"submit",t))}})),initializePpOnListeners()}function hasPpOnAttribute(e){const t=e.attributes;if(!t)return!1;for(let e=0;e<t.length;e++){const n=t[e].name;if(n.startsWith("pp-on:")||n.startsWith("data-pp-on:")||n.startsWith("pp-on-")||n.startsWith("data-pp-on-"))return!0}return!1}function findAllPpOnElements(e){const t=[];if(hasPpOnAttribute(e)&&t.push(e),document.evaluate){const n=document.evaluate('.//*[@*[starts-with(name(), "pp-on:") or starts-with(name(), "data-pp-on:") or starts-with(name(), "pp-on-") or starts-with(name(), "data-pp-on-")]]',e,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE,null);let s=n.iterateNext();for(;s;)t.push(s),s=n.iterateNext()}else if("function"==typeof e.getElementsByTagName){const n=e.getElementsByTagName("*");for(let e=0;e<n.length;e++)hasPpOnAttribute(n[e])&&t.push(n[e])}return t}function initializePpOnListeners(){findAllPpOnElements(document).forEach((e=>{Array.from(e.attributes).forEach((t=>{if(t.name.startsWith("pp-on:")){const n=t.name.split(":")[1],s=t.value;s&&e.addEventListener(n,(t=>{try{new Function("event",s).call(e,t)}catch(e){}}))}}))}))}function handleHiddenAttribute(){const e=document.querySelectorAll("[pp-visibility]"),t=document.querySelectorAll("[pp-display]");e.forEach((e=>handleVisibilityElementAttribute(e,"pp-visibility",handleElementVisibility))),t.forEach((e=>handleVisibilityElementAttribute(e,"pp-display",handleElementDisplay)))}function handleVisibilityElementAttribute(e,t,n){const s=e.getAttribute(t);if(s)if(isJsonLike(s)){n(e,parseJson(s))}else{const n=parseTime(s);if(n>0){const s="pp-visibility"===t?"visibility":"display";scheduleChange(e,n,s,"visibility"===s?"hidden":"none")}}}function isJsonLike(e){return e.trim().startsWith("{")&&e.trim().endsWith("}")}function handleElementVisibility(e,t){handleElementChange(e,t,"visibility","hidden","visible")}function handleElementDisplay(e,t){handleElementChange(e,t,"display","none","block")}function handleElementChange(e,t,n,s,a){const o=t.start?parseTime(t.start):0,i=t.end?parseTime(t.end):0;o>0?(e.style[n]=s,scheduleChange(e,o,n,a),i>0&&scheduleChange(e,o+i,n,s)):i>0&&scheduleChange(e,i,n,s)}function scheduleChange(e,t,n,s){setTimeout((()=>{requestAnimationFrame((()=>{e.style[n]=s}))}),t)}function parseTime(e){if("number"==typeof e)return e;const t=e.match(/^(\d+)(ms|s|m)?$/);if(t){const e=parseInt(t[1],10);switch(t[2]||"ms"){case"ms":return e;case"s":return 1e3*e;case"m":return 60*e*1e3;default:return e}}return 0}async function handleDebounce(e,t,n){const s=e.getAttribute("pp-debounce")||"",a=e.getAttribute("pp-beforeRequest")||"",o=e.getAttribute("pp-afterRequest")||"",i=async t=>{t.preventDefault();try{a&&await invokeHandler(e,a,t),await invokeHandler(e,n,t),o&&"@close"!==o&&await invokeHandler(e,o,t),handlerAutofocusAttribute()}catch(e){}};if(s){const n=debounce(i,parseTime(s));e instanceof HTMLFormElement&&"submit"===t?e.addEventListener(t,(e=>{e.preventDefault(),n(e)})):e.addEventListener(t,n)}else e.addEventListener(t,i)}function handlerAutofocusAttribute(){const e=document.querySelectorAll("[pp-autofocus]");let t=!1;e.forEach((e=>{if(t)return;const n=e.getAttribute("pp-autofocus");if(!n||!isJsonLike(n))return;const s=parseJson(n);if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement)if("number"===e.type&&e instanceof HTMLInputElement){e.type="text";const t=e.value.length||0;e.setSelectionRange(t,t),e.type="number"}else if(s.start)e.setSelectionRange(0,0);else if(s.end){const t=e.value.length||0;e.setSelectionRange(t,t)}else if(s.length){const t=parseInt(s.length,10)||0;e.setSelectionRange(t,t)}e.focus(),t=!0}))}async function invokeHandler(e,t,n){try{const s=t.match(/^(\w+(\.\w+)*)\((.*)\)$/);if(s){const a=s[1].split("."),{context:o,methodName:i}=resolveContext(a);"function"==typeof o[i]?new Function("event",t).call(e,n):await handleParsedCallback(e,t)}else await handleParsedCallback(e,t)}catch(e){}}function resolveContext(e){let t=window;for(let n=0;n<e.length-1;n++)if(t=t[e[n]],!t)throw new Error(`Cannot find object ${e[n]} in the context.`);return{context:t,methodName:e[e.length-1]}}async function handleParsedCallback(e,t){const{funcName:n,data:s}=parseCallback(e,t);if(!n)return;const a=window[n];if("function"==typeof a){const t=e.hasAttribute("pp-afterRequest"),n=Array.isArray(s.args)?s.args:[],o=responseDataDEAC2?parseJson(responseDataDEAC2):{response:responseDataDEAC2};let i={args:n,element:e,data:s};t&&(i={...i,...o}),await a(i)}else responseDataDEAC2=null,responseDataDEAC2=await handleUndefinedFunction(e,n,s)}function handleAnchorTag(e){e instanceof HTMLAnchorElement&&e.addEventListener("click",(async e=>{const t=e.currentTarget,n=t.getAttribute("href"),s=t.getAttribute("target");if(n&&"_blank"!==s&&!e.metaKey&&!e.ctrlKey&&(e.preventDefault(),!isNavigatingA12E1)){isNavigatingA12E1=!0;try{if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else{const[e,t]=n.split("#");if(history.pushState(null,"",n),t){const e=document.getElementById(t);e&&e.scrollIntoView({behavior:"smooth"})}else await handleNavigation()}}catch(e){}finally{isNavigatingA12E1=!1}}}))}async function handleNavigation(){try{const e=window.location.href,t=new URL(e),n=t.pathname+t.search,s=document.getElementById("loading-file-1B87E");if(s){let e=s.querySelector(`div[pp-loading-url='${n}']`);if(e||(e=s.querySelector("div[pp-loading-url='/']")),e){const t=document.querySelector("[pp-loading-content='true']");t?t.innerHTML=e.innerHTML:document.body.innerHTML=e.innerHTML}}const a=await pphpFetch(window.location.href),o=a.match(redirectRegex3AE99);if(o&&o[1]){const e=o[1];await handleRedirect(e)}else updateDocumentContent(a)}catch(e){}}function onUrlChange(){}function updateDocumentContent(e){const t=saveScrollPositions();if(document.removeAllEventListeners("DOMContentLoaded"),e.includes("<!DOCTYPE html>")){const t=e=>{Array.from(e.head.children).forEach((e=>{const t=e.tagName;if("META"===t){if(e.getAttribute("charset")||"viewport"===e.getAttribute("name"))return;const t=e.name,n=e.getAttribute("property"),s=document.head.querySelector(t?`meta[name="${t}"]`:`meta[property="${n}"]`);s?document.head.replaceChild(e.cloneNode(!0),s):document.head.appendChild(e.cloneNode(!0))}else if("TITLE"===t){const t=document.head.querySelector("title");t?document.head.replaceChild(e.cloneNode(!0),t):document.head.appendChild(e.cloneNode(!0))}else if("LINK"===t){const t=t=>{const n=document.head.querySelector('link[rel="icon"]');if(n)document.head.replaceChild(e.cloneNode(!0),n);else{const e=document.createElement("link");e.rel="icon",e.href=t,document.head.appendChild(e)}};if("icon"===e.getAttribute("rel")){t(e.href)}}})),loadAndValidateContent(e)};t((new DOMParser).parseFromString(e,"text/html"))}else{saveState();loadAndValidateContent((new DOMParser).parseFromString(e,"text/html")),restoreState()}restoreScrollPositions(t),attachWireFunctionEvents(),document.dispatchEvent(new Event("DOMContentLoaded"))}function loadAndValidateContent(e){const t=new Map,n=document.createDocumentFragment();function s(e,n){let a=null;if("SCRIPT"===e.tagName){const t=document.createElement("script"),n=e;n.src?(t.src=n.src,t.async=!1):t.textContent=n.textContent,a=t}else a=e.cloneNode(!1),t.set(e,a),Array.from(e.childNodes).forEach((e=>{e.nodeType===Node.TEXT_NODE?a.appendChild(document.createTextNode(e.textContent||"")):e.nodeType===Node.ELEMENT_NODE&&s(e,a)}));n.appendChild(a)}Array.from(e.body.children).forEach((e=>{s(e,n)})),document.body.innerHTML="",document.body.appendChild(n)}function saveState(){const e=document.activeElement;stateA129A.focusId=e?.id||e?.name,stateA129A.focusValue=e?.value,stateA129A.focusChecked=e?.checked,stateA129A.focusType=e?.type,stateA129A.focusSelectionStart=e?.selectionStart,stateA129A.focusSelectionEnd=e?.selectionEnd,stateA129A.isSuspense=e.hasAttribute("pp-suspense"),stateA129A.checkedElements.clear(),document.querySelectorAll('input[type="checkbox"]:checked').forEach((e=>{stateA129A.checkedElements.add(e.id||e.name)})),document.querySelectorAll('input[type="radio"]:checked').forEach((e=>{stateA129A.checkedElements.add(e.id||e.name)}))}function restoreState(){if(stateA129A.focusId){const e=document.getElementById(stateA129A.focusId)||document.querySelector(`[name="${stateA129A.focusId}"]`);if(e instanceof HTMLInputElement){const t=e.value.length||0;void 0!==stateA129A.focusSelectionStart&&null!==stateA129A.focusSelectionEnd&&e.setSelectionRange(t,t),stateA129A.focusValue&&("checkbox"===e.type||"radio"===e.type?e.checked=!!stateA129A.focusChecked:"number"===e.type?(e.type="text",e.setSelectionRange(t,t),e.type="number"):""!==e.value&&(e.value=stateA129A.focusValue)),e.focus()}else if(e instanceof HTMLTextAreaElement){const t=e.value.length||0;void 0!==stateA129A.focusSelectionStart&&null!==stateA129A.focusSelectionEnd&&e.setSelectionRange(t,t),stateA129A.focusValue&&""!==e.value&&(e.value=stateA129A.focusValue),e.focus()}else e instanceof HTMLSelectElement&&(stateA129A.focusValue&&""!==e.value&&(e.value=stateA129A.focusValue),e.focus())}stateA129A.checkedElements.forEach((e=>{const t=document.getElementById(e);t&&(t.checked=!0)}))}function saveScrollPositions(){const e={};return document.querySelectorAll("*").forEach((t=>{(t.scrollTop||t.scrollLeft)&&(e[getElementKey(t)]={scrollTop:t.scrollTop,scrollLeft:t.scrollLeft})})),e}function restoreScrollPositions(e){document.querySelectorAll("*").forEach((t=>{const n=getElementKey(t);e[n]&&(t.scrollTop=e[n].scrollTop,t.scrollLeft=e[n].scrollLeft)}))}function getElementKey(e){return e.id||e.className||e.tagName}async function pphpFetch(e,t){const n=await fetch(e,{...t,headers:{...t?.headers,"X-Requested-With":"XMLHttpRequest"}});return await n.text()}function parseCallback(e,t){let n={};const s=e.closest("form");if(s){new FormData(s).forEach(((e,t)=>{n[t]?Array.isArray(n[t])?n[t].push(e):n[t]=[n[t],e]:n[t]=e}))}else e instanceof HTMLInputElement?n=handleInputElement(e):(e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(n[e.name]=e.value);const a=t.match(/(\w+)\((.*)\)/);if(a){const e=a[1];let t=a[2].trim();if(t.startsWith("{")&&t.endsWith("}"))try{const e=parseJson(t);"object"==typeof e&&null!==e&&(n={...n,...e})}catch(e){}else{const e=t.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((e=>e.trim().replace(/^['"]|['"]$/g,"")));n.args=e}return{funcName:e,data:n}}return{funcName:t,data:n}}function handleInputElement(e){let t={};if(e.name)if("checkbox"===e.type)t[e.name]={value:e.value,checked:e.checked};else if("radio"===e.type){const n=document.querySelector(`input[name="${e.name}"]:checked`);t[e.name]=n?n.value:null}else t[e.name]=e.value;else"checkbox"===e.type||"radio"===e.type?t.value=e.checked:t.value=e.value;return t}function updateElementAttributes(e,t){for(const n in t)if(t.hasOwnProperty(n))switch(n){case"innerHTML":case"outerHTML":case"textContent":case"innerText":e[n]=decodeHTML(t[n]);break;case"insertAdjacentHTML":e.insertAdjacentHTML(t.position||"beforeend",decodeHTML(t[n].html));break;case"insertAdjacentText":e.insertAdjacentText(t.position||"beforeend",decodeHTML(t[n].text));break;case"setAttribute":e.setAttribute(t.attrName,decodeHTML(t[n]));break;case"removeAttribute":e.removeAttribute(t[n]);break;case"className":e.className=decodeHTML(t[n]);break;case"classList.add":e.classList.add(...decodeHTML(t[n]).split(","));break;case"classList.remove":e.classList.remove(...decodeHTML(t[n]).split(","));break;case"classList.toggle":e.classList.toggle(decodeHTML(t[n]));break;case"classList.replace":const[s,a]=decodeHTML(t[n]).split(",");e.classList.replace(s,a);break;case"dataset":e.dataset[t.attrName]=decodeHTML(t[n]);break;case"style":Object.assign(e.style,t[n]);break;case"value":e.value=decodeHTML(t[n]);break;case"checked":e.checked=t[n];break;default:e.setAttribute(n,decodeHTML(t[n]))}}function decodeHTML(e){const t=document.createElement("textarea");return t.innerHTML=e,t.value}function saveElementOriginalState(e){if(e.hasAttribute("pp-suspense")&&!e.hasAttribute("pp-original-state")){const t={};e.textContent&&(t.textContent=e.textContent.trim()),(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)&&(t.value=e.value);for(let n=0;n<e.attributes.length;n++){const s=e.attributes[n];t[s.name]=s.value}e.setAttribute("pp-original-state",JSON.stringify(t))}e.querySelectorAll("[pp-suspense]").forEach((e=>saveElementOriginalState(e)))}async function handleSuspenseElement(e){let t=e.getAttribute("pp-suspense")||"";const n=(e,t)=>{for(const n in t)if(t.hasOwnProperty(n))for(const t of e.elements)if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-suspense")||"";if(e)if(isJsonLike(e)){const n=parseJson(e);"disabled"!==n.onsubmit&&updateElementAttributes(t,n)}else s(t,e)}},s=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t};try{if(t&&isJsonLike(t)){const s=parseJson(t);if(s)if(e instanceof HTMLFormElement){const t=new FormData(e),a={};t.forEach(((e,t)=>{a[t]=e})),s.disabled&&toggleFormElements(e,!0);const{disabled:o,...i}=s;updateElementAttributes(e,i),n(e,a)}else if(s.targets){s.targets.forEach((e=>{const{id:t,...s}=e,a=document.querySelector(t);a&&((e,t)=>{e instanceof HTMLFormElement?n(e,t):updateElementAttributes(e,t)})(a,s)}));const{targets:t,...a}=s;updateElementAttributes(e,a)}else{if("disabled"===s.empty&&""===e.value)return;const{empty:t,...n}=s;updateElementAttributes(e,n)}}else if(t)s(e,t);else if(e instanceof HTMLFormElement){const t=new FormData(e),s={};t.forEach(((e,t)=>{s[t]=e})),n(e,s)}}catch(e){}}function restoreSuspenseElement(e){const t=e.getAttribute("pp-original-state");if(e.hasAttribute("pp-suspense")&&t){const n=(e,t)=>{const n=document.createElement(e.tagName);for(const s in t)t.hasOwnProperty(s)&&("textContent"===s?(e.textContent="",n.textContent=t[s]):"disabled"===s?!0===t[s]?n.setAttribute("disabled","true"):n.removeAttribute("disabled"):n.setAttribute(s,t[s]));for(;e.firstChild;)n.appendChild(e.firstChild);return e.replaceWith(n),n},s=(e,t)=>{for(const s in t)if(t.hasOwnProperty(s))for(const t of Array.from(e.elements))if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-original-state")||"";if(e){if(isJsonLike(e)){const s=parseJson(e),a=n(t,s);t.replaceWith(a)}else a(t,e);t.removeAttribute("pp-original-state")}}},a=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t},o=(e,t)=>{if(e instanceof HTMLFormElement)s(e,t);else{const s=n(e,t);e.replaceWith(s)}};try{const a=JSON.parse(t);if(a)if(e instanceof HTMLFormElement){const t=new FormData(e),n={};if(t.forEach(((e,t)=>{n[t]=e})),s(e,n),e.hasAttribute("pp-suspense")){const t=e.getAttribute("pp-suspense")||"";if(parseJson(t).disabled)for(const t of Array.from(e.elements))(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)&&t.removeAttribute("disabled")}}else if(a.targets){a.targets.forEach((e=>{const{id:t,...n}=e,s=document.querySelector(t);s&&o(s,n)}));const{targets:t,...s}=a,i=n(e,s);e.replaceWith(i)}else{const{empty:t,...s}=a,o=n(e,s);e.replaceWith(o)}}catch(e){}}e.querySelectorAll("[pp-suspense]").forEach((e=>restoreSuspenseElement(e))),e.removeAttribute("pp-original-state")}function parseJson(e){return isJsonLike(e)?JSON.parse(e.replace(/'/g,'"')):null}function toggleFormElements(e,t){Array.from(e.elements).forEach((e=>{(e instanceof HTMLInputElement||e instanceof HTMLButtonElement||e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(e.disabled=t)}))}async function handleUndefinedFunction(e,t,n){const s={callback:t,...n},a={method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(s)},o={method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify({secondRequestC69CD:!0})};try{saveElementOriginalState(e),handleSuspenseElement(e);const t=window.location.pathname;let n=await pphpFetch(t,a);const s=extractJson(n)||"";let i={success:!1};if(s)try{i=JSON.parse(s)}catch(e){}const r=hasPpOnAttribute(e),c=e.getAttribute("pp-beforeRequest")||"",l=e.getAttribute("pp-afterRequest")||"";if((r||c||l&&i.success)&&restoreSuspenseElement(e),r||c){let e="";if(i.success){e=n.replace(s,"")}else e=n;return void appendAfterbegin(e)}if(l&&i.success){handleAfterRequest(l,s);return appendAfterbegin(n.replace(s,"")),s}const u=await pphpFetch(t,o),d=n.match(redirectRegex3AE99);if(d&&d[1]){const e=d[1];await handleRedirect(e)}else{const e=(new DOMParser).parseFromString(u,"text/html");let t=document.createElement("div");if(t.id="afterbegin-8D95D",s)if(i.success){const e=n.replace(s,"");t.innerHTML=e}else t.innerHTML=n;else t.innerHTML=n;t.innerHTML&&e.body.insertAdjacentElement("afterbegin",t),updateDocumentContent(e.body.outerHTML)}}catch(e){}}function appendAfterbegin(e){if(!e)return;let t=document.getElementById("afterbegin-8D95D");t?(t.innerHTML=e,document.body.insertAdjacentElement("afterbegin",t)):(t=document.createElement("div"),t.id="afterbegin-8D95D",t.innerHTML=e,document.body.insertAdjacentElement("afterbegin",t))}function extractJson(e){const t=e.match(/\{[\s\S]*\}/);return t?t[0]:null}function handleAfterRequest(e,t){if(!isJsonLike(e))return;const n=parseJson(e),s=t?parseJson(t):null,a=n.targets;Array.isArray(a)&&a.forEach((e=>{const{id:t,...n}=e,a=document.querySelector(t);let o={};if(s){for(const t in n)if(n.hasOwnProperty(t))switch(t){case"innerHTML":case"outerHTML":case"textContent":case"innerText":"response"===n[t]&&(o[t]=e.responseKey?s[e.responseKey]:s.response);break;default:o[t]=n[t];break}}else o=n;a&&updateElementAttributes(a,o)}))}async function handleRedirect(e){if(e)try{const t=new URL(e,window.location.origin);t.origin!==window.location.origin?window.location.href=e:(history.pushState(null,"",e),await handleNavigation())}catch(e){}}function debounce(e,t=300,n=!1){let s;return function(...a){const o=this;s&&clearTimeout(s),s=setTimeout((()=>{s=null,n||e.apply(o,a)}),t),n&&!s&&e.apply(o,a)}}function copyCode(e,t,n,s,a=2e3){if(!(e instanceof HTMLElement))return;const o=e.closest(`.${t}`)?.querySelector("pre code"),i=o?.textContent?.trim()||"";i?navigator.clipboard.writeText(i).then((()=>{const t=e.querySelector("i");t&&(t.className=s),setTimeout((()=>{t&&(t.className=n)}),a)}),(()=>{alert("Failed to copy command to clipboard")})):alert("Failed to find the code block to copy")}if((()=>{const e=EventTarget.prototype.addEventListener,t=new Map;EventTarget.prototype.addEventListener=function(n,s,a){t.has(this)||t.set(this,new Map);const o=t.get(this).get(n)||new Set;o.add(s),t.get(this).set(n,o),e.call(this,n,s,a)},EventTarget.prototype.removeAllEventListeners=function(e){t.has(this)&&t.get(this).has(e)&&(t.get(this).get(e).forEach((t=>{this.removeEventListener(e,t)})),t.get(this).delete(e))}})(),(e=>{const t=e.pushState,n=e.replaceState;e.pushState=function(n,s,a){const o=t.apply(e,arguments);return window.dispatchEvent(new Event("urlchange")),o},e.replaceState=function(t,s,a){const o=n.apply(e,arguments);return window.dispatchEvent(new Event("urlchange")),o}})(window.history),document.addEventListener("DOMContentLoaded",attachWireFunctionEvents),window.addEventListener("popstate",(async()=>{await handleNavigation()})),window.addEventListener("urlchange",(()=>{})),null===store){class e{static instance=null;state;listeners;constructor(e={}){this.state=e,this.listeners=[]}static getInstance(t={}){return e.instance||(e.instance=new e(t),e.instance.loadState()),e.instance}setState(e){this.state={...this.state,...e},this.listeners.forEach((e=>e(this.state))),this.saveState()}subscribe(e){return this.listeners.push(e),e(this.state),()=>{this.listeners=this.listeners.filter((t=>t!==e))}}saveState(){localStorage.setItem("appState_59E13",JSON.stringify(this.state))}loadState(){const e=localStorage.getItem("appState_59E13");e&&(this.state=JSON.parse(e),this.listeners.forEach((e=>e(this.state))))}resetState(){this.state={},this.listeners.forEach((e=>e(this.state))),localStorage.removeItem("appState_59E13")}}store=e.getInstance()}