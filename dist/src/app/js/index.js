var eventAttributesB6B56=["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"],stateA129A={checkedElements:new Set},responseDataDEAC2=null,store=null,isNavigatingA12E1=!1,redirectRegex3AE99=/redirect_7F834\s*=\s*(\/[^\s]*)/;function observeDOMChanges(){new MutationObserver((e=>{for(const t of e)"childList"===t.type&&t.addedNodes.length>0&&attachWireFunctionEvents()})).observe(document.body,{childList:!0,subtree:!0})}function attachWireFunctionEvents(){handleHiddenAttribute();document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((e=>{if(handleAnchorTag(e),eventAttributesB6B56.forEach((t=>{const n=e.getAttribute(t),o=t.slice(2);n&&(e.removeAttribute(t),handleDebounce(e,o,n))})),e instanceof HTMLFormElement){const t=e.getAttribute("onsubmit");t&&(e.removeAttribute("onsubmit"),handleDebounce(e,"submit",t))}}))}function handleHiddenAttribute(){const e=document.querySelectorAll("[pp-visibility]"),t=document.querySelectorAll("[pp-display]");e.forEach((e=>handleVisibilityElementAttribute(e,"pp-visibility",handleElementVisibility))),t.forEach((e=>handleVisibilityElementAttribute(e,"pp-display",handleElementDisplay)))}function handleVisibilityElementAttribute(e,t,n){const o=e.getAttribute(t);if(o)if(isJsonLike(o)){n(e,parseJson(o))}else{const n=parseTime(o);if(n>0){const o="pp-visibility"===t?"visibility":"display";scheduleChange(e,n,o,"visibility"===o?"hidden":"none")}}}function isJsonLike(e){return"string"==typeof e&&((e=e.trim()).startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))}function handleElementVisibility(e,t){handleElementChange(e,t,"visibility","hidden","visible")}function handleElementDisplay(e,t){handleElementChange(e,t,"display","none","block")}function handleElementChange(e,t,n,o,s){const a=t.start?parseTime(t.start):0,r=t.end?parseTime(t.end):0;a>0?(e.style[n]=o,scheduleChange(e,a,n,s),r>0&&scheduleChange(e,a+r,n,o)):r>0&&scheduleChange(e,r,n,o)}function scheduleChange(e,t,n,o){setTimeout((()=>{requestAnimationFrame((()=>{e.style[n]=o}))}),t)}function parseTime(e){if("number"==typeof e)return e;const t=e.match(/^(\d+)(ms|s|m)?$/);if(t){const e=parseInt(t[1],10);switch(t[2]||"ms"){case"ms":return e;case"s":return 1e3*e;case"m":return 60*e*1e3;default:return e}}return 0}async function handleDebounce(e,t,n){e.removeAllEventListeners(t);const o=e.getAttribute("pp-debounce")||"",s=e.getAttribute("pp-before-request")||"",a=e.getAttribute("pp-after-request")||"",r=async t=>{t.preventDefault();try{s&&await invokeHandler(e,s,t),await invokeHandler(e,n,t),a&&"@close"!==a&&await invokeHandler(e,a,t),handlerAutofocusAttribute()}catch(e){}};if(o){const n=debounce(r,parseTime(o));e instanceof HTMLFormElement&&"submit"===t?e.addEventListener(t,(e=>{e.preventDefault(),n(e)})):e.addEventListener(t,n)}else e.addEventListener(t,r)}function handlerAutofocusAttribute(){const e=document.querySelectorAll("[pp-autofocus]");let t=!1;e.forEach((e=>{if(t)return;const n=e.getAttribute("pp-autofocus");if(!n||!isJsonLike(n))return;const o=parseJson(n);if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement){const t=["text","search","tel","url","password"];if(e instanceof HTMLInputElement)if(t.includes(e.type))if("number"===e.type){e.type="text";const t=e.value.length||0;e.setSelectionRange(t,t),e.type="number"}else setCursorPosition(e,o);else;else e instanceof HTMLTextAreaElement&&setCursorPosition(e,o)}e.focus(),t=!0}))}function setCursorPosition(e,t){if(t.start)e.setSelectionRange(0,0);else if(t.end){const t=e.value.length||0;e.setSelectionRange(t,t)}else if(t.length){const n=parseInt(t.length,10)||0;e.setSelectionRange(n,n)}}async function invokeHandler(e,t,n){try{const o=t.match(/^(\w+(\.\w+)*)\((.*)\)$/);if(o){const s=o[1].split("."),{context:a,methodName:r}=resolveContext(s);"function"==typeof a[r]?new Function("event",t).call(e,n):await handleParsedCallback(e,t)}else await handleParsedCallback(e,t)}catch(e){}}function resolveContext(e){let t=window;for(let n=0;n<e.length-1;n++)if(t=t[e[n]],!t)throw new Error(`Cannot find object ${e[n]} in the context.`);return{context:t,methodName:e[e.length-1]}}async function handleParsedCallback(e,t){const{funcName:n,data:o}=parseCallback(e,t);if(!n)return;const s=window[n];if("function"==typeof s){const t=e.hasAttribute("pp-after-request"),n=Array.isArray(o.args)?o.args:[],a=responseDataDEAC2?parseJson(responseDataDEAC2):{response:responseDataDEAC2};let r={args:n,element:e,data:o};t&&(r={...r,...a}),await s(r)}else responseDataDEAC2=null,responseDataDEAC2=await handleUndefinedFunction(e,n,o)}function handleAnchorTag(e){e instanceof HTMLAnchorElement&&e.addEventListener("click",(async e=>{const t=e.currentTarget,n=t.getAttribute("href"),o=t.getAttribute("target");if(n&&"_blank"!==o&&!e.metaKey&&!e.ctrlKey&&(e.preventDefault(),!isNavigatingA12E1)){isNavigatingA12E1=!0;try{if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else{const e=t.getAttribute("pp-append-params");if(n.startsWith("?")&&"true"===e){const e=new URL(window.location.href),t=new URLSearchParams(e.search);let o="";const[s,a]=n.split("#");a&&(o=`#${a}`);new URLSearchParams(s.split("?")[1]).forEach(((e,n)=>{t.set(n,e)}));const r=`${e.pathname}?${t.toString()}${o}`;history.pushState(null,"",r)}else{const[e,t]=n.split("#"),o=`${e}${t?`#${t}`:""}`;history.pushState(null,"",o)}const o=n.indexOf("#");if(-1!==o){const e=n.slice(o+1),t=document.getElementById(e);if(t)t.scrollIntoView({behavior:"smooth"});else{await handleNavigation();const t=document.getElementById(e);t&&t.scrollIntoView({behavior:"smooth"})}}else await handleNavigation()}}catch(e){}finally{isNavigatingA12E1=!1}}}))}async function handleNavigation(){try{const e=e=>{const t=e.querySelector("[pp-loading-transition]")?.getAttribute("pp-loading-transition");let n=250,o=250;if(t)try{const e=parseJson(t);n=parseTime(e.fadeIn||n),o=parseTime(e.fadeOut||o)}catch(e){}return{fadeIn:n,fadeOut:o}},t=(e,t)=>new Promise((n=>{e.style.transition=`opacity ${t}ms ease-out`,e.style.opacity="0",setTimeout((()=>{e.style.transition="",n()}),t)})),n=(e,t)=>{e.style.transition=`opacity ${t}ms ease-in`,e.style.opacity="1",setTimeout((()=>{e.style.transition=""}),t)},o=async o=>{const s=document.querySelector("[pp-loading-content='true']")||document.body;if(s){const{fadeIn:a,fadeOut:r}=e(o);await t(s,r),s.innerHTML=o.innerHTML,n(s,a)}},s=window.location.pathname,a=document.getElementById("loading-file-1B87E");if(a){let e=a.querySelector(`div[pp-loading-url='${s}']`);e||(e=a.querySelector("div[pp-loading-url='/']")),e&&await o(e)}const r=await pphpFetch(window.location.href),i=r.match(redirectRegex3AE99);if(i&&i[1]){const e=i[1];await handleRedirect(e)}else updateDocumentContent(r)}catch(e){}}function onUrlChange(){}function updateContentPreservingChanges(e,t){"true"!==e.getAttribute("pp-static")&&"true"!==t.getAttribute("pp-static")&&(updateAttributes(e,t),updateChildNodes(e,t))}function updateAttributes(e,t){const n=e.attributes,o=t.attributes,s=new Set;for(let t=0;t<o.length;t++){const n=o[t];s.add(n.name),e.getAttribute(n.name)!==n.value&&e.setAttribute(n.name,n.value)}for(let t=n.length-1;t>=0;t--){const o=n[t].name;s.has(o)||e.removeAttribute(o)}}function updateChildNodes(e,t){const n=Array.from(e.childNodes),o=Array.from(t.childNodes);let s=0,a=0;for(;a<o.length;){const t=o[a],r=n[s];r&&r.nodeType===Node.ELEMENT_NODE&&"true"===r.getAttribute("pp-static")||t.nodeType===Node.ELEMENT_NODE&&"true"===t.getAttribute("pp-static")?(s++,a++):r?isSameNodeType(r,t)?(r.nodeType===Node.ELEMENT_NODE?updateContentPreservingChanges(r,t):r.nodeType===Node.TEXT_NODE&&r.textContent!==t.textContent&&(r.textContent=t.textContent),s++,a++):(e.replaceChild(t.cloneNode(!0),r),s++,a++):(e.appendChild(t.cloneNode(!0)),a++)}for(;n.length>o.length;){const t=n.pop();if(!(t&&t instanceof Node))break;e.removeChild(t)}}function isSameNodeType(e,t){return e.nodeType===t.nodeType&&(e.nodeType!==Node.ELEMENT_NODE||e.tagName===t.tagName)}async function updateBodyContent(e){const t=saveScrollPositions();saveState();const n=(new DOMParser).parseFromString(e,"text/html"),o=document.getElementById("pphp-7CA7BB68A3656A88"),s=n.getElementById("afterbegin-8D95D"),a=n.getElementById("pphp-7CA7BB68A3656A88");if(s){const e=document.getElementById("afterbegin-8D95D");e?e.innerHTML=s.innerHTML:document.body.insertAdjacentHTML("afterbegin",s.outerHTML)}o&&a&&updateContentPreservingChanges(o,a),restoreState(),restoreScrollPositions(t),attachWireFunctionEvents(),document.dispatchEvent(new Event("DOMContentLoaded"))}async function updateDocumentContent(e){const t=saveScrollPositions();document.removeAllEventListeners("DOMContentLoaded");const n=(new DOMParser).parseFromString(e,"text/html"),o="pp-dynamic-script",s="pp-dynamic-link";document.head.querySelectorAll("[pp-dynamic-meta]").forEach((e=>e.remove()));document.head.querySelectorAll("[pp-dynamic-link]").forEach((e=>e.remove()));document.head.querySelectorAll("[pp-dynamic-script]").forEach((e=>e.remove()));await(async e=>{Array.from(e.head.children).forEach((e=>{const t=e.tagName;if("SCRIPT"===t&&e.hasAttribute(o)){const t=document.createElement("script");Array.from(e.attributes).forEach((e=>t.setAttribute(e.name,e.value))),e.textContent&&(t.textContent=e.textContent),document.head.appendChild(t)}else if("META"===t){if(e.getAttribute("charset")||"viewport"===e.getAttribute("name"))return;const t=e.name,n=e.getAttribute("property"),o=document.head.querySelector(t?`meta[name="${t}"]`:`meta[property="${n}"]`);o?document.head.replaceChild(e.cloneNode(!0),o):document.head.appendChild(e.cloneNode(!0))}else if("TITLE"===t){const t=document.head.querySelector("title");t?document.head.replaceChild(e.cloneNode(!0),t):document.head.appendChild(e.cloneNode(!0))}else if("LINK"===t){const t=t=>{const n=document.head.querySelector('link[rel="icon"]');if(n)document.head.replaceChild(e.cloneNode(!0),n);else{const e=document.createElement("link");e.rel="icon",e.href=t,document.head.appendChild(e)}};if("icon"===e.getAttribute("rel")){t(e.href)}else if(e.hasAttribute(s)){const t=e.cloneNode(!0);document.head.appendChild(t)}}})),populateDocumentBody(e)})(n),restoreScrollPositions(t),attachWireFunctionEvents(),document.dispatchEvent(new Event("DOMContentLoaded"))}async function populateDocumentBody(e){const t=new Map,n=document.createDocumentFragment();function o(e,n){let s=null;if("SCRIPT"===e.tagName){const t=e,n=document.createElement("script");Array.from(t.attributes).forEach((e=>{n.setAttribute(e.name,e.value)})),t.src?(n.src=t.src,n.async=!1):n.textContent=t.textContent,s=n}else s=e.cloneNode(!1),t.set(e,s),Array.from(e.childNodes).forEach((e=>{e.nodeType===Node.TEXT_NODE?s.appendChild(document.createTextNode(e.textContent||"")):e.nodeType===Node.ELEMENT_NODE&&o(e,s)}));n.appendChild(s)}Array.from(e.body.children).forEach((e=>{o(e,n)})),document.body.innerHTML="",document.body.appendChild(n)}function saveState(){const e=document.activeElement;stateA129A.focusId=e?.id||e?.name,stateA129A.focusValue=e?.value,stateA129A.focusChecked=e?.checked,stateA129A.focusType=e?.type,stateA129A.focusSelectionStart=e?.selectionStart,stateA129A.focusSelectionEnd=e?.selectionEnd,stateA129A.isSuspense=e.hasAttribute("pp-suspense"),stateA129A.checkedElements.clear(),document.querySelectorAll('input[type="checkbox"]:checked').forEach((e=>{stateA129A.checkedElements.add(e.id||e.name)})),document.querySelectorAll('input[type="radio"]:checked').forEach((e=>{stateA129A.checkedElements.add(e.id||e.name)}))}function restoreState(){if(stateA129A.focusId){const e=document.getElementById(stateA129A.focusId)||document.querySelector(`[name="${stateA129A.focusId}"]`);if(e instanceof HTMLInputElement){const t=e.value.length||0;void 0!==stateA129A.focusSelectionStart&&null!==stateA129A.focusSelectionEnd&&e.setSelectionRange(t,t),stateA129A.focusValue&&("checkbox"===e.type||"radio"===e.type?e.checked=!!stateA129A.focusChecked:"number"===e.type||"email"===e.type?(e.type="text",e.setSelectionRange(t,t),e.type="number"===e.type?"number":"email"):"date"===e.type||"month"===e.type||"week"===e.type||"time"===e.type||"datetime-local"===e.type||"color"===e.type||"file"===e.type||""!==e.value&&(e.value=stateA129A.focusValue)),e.focus()}else if(e instanceof HTMLTextAreaElement){const t=e.value.length||0;void 0!==stateA129A.focusSelectionStart&&null!==stateA129A.focusSelectionEnd&&e.setSelectionRange(t,t),stateA129A.focusValue&&""!==e.value&&(e.value=stateA129A.focusValue),e.focus()}else e instanceof HTMLSelectElement&&(stateA129A.focusValue&&""!==e.value&&(e.value=stateA129A.focusValue),e.focus())}stateA129A.checkedElements.forEach((e=>{const t=document.getElementById(e);t&&(t.checked=!0)}))}function saveScrollPositions(){const e={window:{scrollTop:window.scrollY||document.documentElement.scrollTop,scrollLeft:window.scrollX||document.documentElement.scrollLeft}};return document.querySelectorAll("*").forEach((t=>{(t.scrollTop||t.scrollLeft)&&(e[getElementKey(t)]={scrollTop:t.scrollTop,scrollLeft:t.scrollLeft})})),e}function restoreScrollPositions(e){requestAnimationFrame((()=>{const t=e.window;t&&window.scrollTo(t.scrollLeft,t.scrollTop),document.querySelectorAll("*").forEach((t=>{const n=getElementKey(t);e[n]&&(t.scrollTop=e[n].scrollTop,t.scrollLeft=e[n].scrollLeft)}))}))}function getElementKey(e){return e.id||e.className||e.tagName}async function pphpFetch(e,t){const n=await fetch(e,{...t,headers:{...t?.headers,"X-Requested-With":"XMLHttpRequest"}});return await n.text()}function parseCallback(e,t){let n={};const o=e.closest("form");if(o){new FormData(o).forEach(((e,t)=>{n[t]?Array.isArray(n[t])?n[t].push(e):n[t]=[n[t],e]:n[t]=e}))}else e instanceof HTMLInputElement?n=handleInputElement(e):(e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(n[e.name]=e.value);const s=t.match(/(\w+)\((.*)\)/);if(s){const e=s[1];let t=s[2].trim();if(t.startsWith("{")&&t.endsWith("}"))try{const e=parseJson(t);"object"==typeof e&&null!==e&&(n={...n,...e})}catch(e){}else{const e=t.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((e=>e.trim().replace(/^['"]|['"]$/g,"")));n.args=e}return{funcName:e,data:n}}return{funcName:t,data:n}}function handleInputElement(e){let t={};if(e.name)if("checkbox"===e.type)t[e.name]={value:e.value,checked:e.checked};else if("radio"===e.type){const n=document.querySelector(`input[name="${e.name}"]:checked`);t[e.name]=n?n.value:null}else t[e.name]=e.value;else"checkbox"===e.type||"radio"===e.type?t.value=e.checked:t.value=e.value;return t}function updateElementAttributes(e,t){for(const n in t)if(t.hasOwnProperty(n))switch(n){case"innerHTML":case"outerHTML":case"textContent":case"innerText":e[n]=decodeHTML(t[n]);break;case"insertAdjacentHTML":e.insertAdjacentHTML(t.position||"beforeend",decodeHTML(t[n].html));break;case"insertAdjacentText":e.insertAdjacentText(t.position||"beforeend",decodeHTML(t[n].text));break;case"setAttribute":e.setAttribute(t.attrName,decodeHTML(t[n]));break;case"removeAttribute":e.removeAttribute(t[n]);break;case"className":e.className=decodeHTML(t[n]);break;case"classList.add":e.classList.add(...decodeHTML(t[n]).split(","));break;case"classList.remove":e.classList.remove(...decodeHTML(t[n]).split(","));break;case"classList.toggle":e.classList.toggle(decodeHTML(t[n]));break;case"classList.replace":const[o,s]=decodeHTML(t[n]).split(",");e.classList.replace(o,s);break;case"dataset":e.dataset[t.attrName]=decodeHTML(t[n]);break;case"style":Object.assign(e.style,t[n]);break;case"value":e.value=decodeHTML(t[n]);break;case"checked":e.checked=t[n];break;default:e.setAttribute(n,decodeHTML(t[n]))}}function decodeHTML(e){const t=document.createElement("textarea");return t.innerHTML=e,t.value}function saveElementOriginalState(e){if(e.hasAttribute("pp-suspense")&&!e.hasAttribute("pp-original-state")){const t={};e.textContent&&(t.textContent=e.textContent.trim()),e.innerHTML&&(t.innerHTML=e.innerHTML.trim()),(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)&&(t.value=e.value);for(let n=0;n<e.attributes.length;n++){const o=e.attributes[n];t[o.name]=o.value}e.setAttribute("pp-original-state",JSON.stringify(t))}e.querySelectorAll("[pp-suspense]").forEach((e=>saveElementOriginalState(e)))}async function handleSuspenseElement(e){let t=e.getAttribute("pp-suspense")||"";const n=(e,t)=>{for(const n in t)if(t.hasOwnProperty(n))for(const t of e.elements)if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-suspense")||"";if(e)if(isJsonLike(e)){const n=parseJson(e);"disabled"!==n.onsubmit&&updateElementAttributes(t,n),n.targets&&n.targets.forEach((e=>{const{id:t,...n}=e,o=document.querySelector(t);o&&s(o,n)}))}else o(t,e)}},o=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t},s=(e,t)=>{e instanceof HTMLFormElement?n(e,t):updateElementAttributes(e,t)};try{if(t&&isJsonLike(t)){const o=parseJson(t);if(o)if(e instanceof HTMLFormElement){const t=new FormData(e),s={};t.forEach(((e,t)=>{s[t]=e})),o.disabled&&toggleFormElements(e,!0);const{disabled:a,...r}=o;updateElementAttributes(e,r),n(e,s)}else if(o.targets){o.targets.forEach((e=>{const{id:t,...n}=e,o=document.querySelector(t);o&&s(o,n)}));const{targets:t,...n}=o;updateElementAttributes(e,n)}else{if("disabled"===o.empty&&""===e.value)return;const{empty:t,...n}=o;updateElementAttributes(e,n)}}else if(t)o(e,t);else if(e instanceof HTMLFormElement){const t=new FormData(e),o={};t.forEach(((e,t)=>{o[t]=e})),n(e,o)}}catch(e){}}function restoreSuspenseElement(e){const t=e.getAttribute("pp-original-state");if(e.hasAttribute("pp-suspense")&&t){const n=(e,t)=>{for(const n in t)t.hasOwnProperty(n)&&("textContent"===n?e.textContent=t[n]:"innerHTML"===n?e.innerHTML=t[n]:"disabled"===n?!0===t[n]?e.setAttribute("disabled","true"):e.removeAttribute("disabled"):e.setAttribute(n,t[n]));for(const n of Array.from(e.attributes))t.hasOwnProperty(n.name)||e.removeAttribute(n.name)},o=(e,t)=>{for(const o in t)if(t.hasOwnProperty(o))for(const t of Array.from(e.elements))if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-original-state")||"";if(e){if(isJsonLike(e)){const o=parseJson(e);n(t,o)}else s(t,e);t.removeAttribute("pp-original-state")}}},s=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t},a=(e,t)=>{e instanceof HTMLFormElement?o(e,t):n(e,t)};try{const s=parseJson(t);if(s)if(e instanceof HTMLFormElement){const t=new FormData(e),n={};if(t.forEach(((e,t)=>{n[t]=e})),o(e,n),e.hasAttribute("pp-suspense")){const t=e.getAttribute("pp-suspense")||"";if(parseJson(t).disabled)for(const t of Array.from(e.elements))(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)&&t.removeAttribute("disabled")}}else if(s.targets){s.targets.forEach((e=>{const{id:t,...n}=e,o=document.querySelector(t);o&&a(o,n)}));const{targets:t,...o}=s;n(e,o)}else{const{empty:t,...o}=s;n(e,o)}}catch(e){}}e.querySelectorAll("[pp-suspense]").forEach((e=>restoreSuspenseElement(e))),e.removeAttribute("pp-original-state")}function parseJson(e){try{return JSON5.parse(e)}catch(e){return null}}function toggleFormElements(e,t){Array.from(e.elements).forEach((e=>{(e instanceof HTMLInputElement||e instanceof HTMLButtonElement||e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(e.disabled=t)}))}async function pphpFetchFile(e,t,n){const o=new FormData,s=n.files;if(s)for(let e=0;e<s.length;e++)o.append("file[]",s[e]);o.append("callback",t);const a=await fetch(e,{method:"POST",headers:{HTTP_PPHP_WIRE_REQUEST:"true"},body:o});return await a.text()}function getUrlParams(){const e={};return new URLSearchParams(window.location.search).forEach(((t,n)=>{e[n]=t})),e}async function handleUndefinedFunction(e,t,n){const o=createFetchOptions({callback:t,...n}),s=createFetchOptions({secondRequestC69CD:!0,...getUrlParams()});try{saveElementOriginalState(e),handleSuspenseElement(e);const n=new URL(window.location.href);let a="",r="",i={success:!1};const c=e.querySelector("input[type='file']");if(c){if(a=await pphpFetchFile(n.href,t,c),r=extractJson(a)||"",r)try{i=parseJson(r)}catch(e){}}else if(a=await pphpFetch(n.href,o),r=extractJson(a)||"",r)try{i=parseJson(r)}catch(e){}const l=e.getAttribute("pp-before-request")||"",u=e.getAttribute("pp-after-request")||"";if((l||u&&i.success)&&restoreSuspenseElement(e),l||u){let e="";if(i.success){e=a.replace(r,"")}else e=a;if(appendAfterbegin(e),!u&&!i.success)return}if(u&&i.success){handleAfterRequest(u,r);return appendAfterbegin(a.replace(r,"")),r}if("@close"===u)return i.success?r:void 0;const d=await pphpFetch(n.href,s);await handleResponseRedirectOrUpdate(a,d,r,i)}catch(e){}}function createFetchOptions(e){return{method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(e)}}function getRedirectUrl(e){const t=e.match(redirectRegex3AE99);return t?t[1]:null}function getUpdatedHTMLContent(e,t,n){const o=document.createElement("div");if(o.id="afterbegin-8D95D",n&&t?.success){const t=e.replace(n,"");o.innerHTML=t}else o.innerHTML=e;return o.innerHTML?o:null}async function handleResponseRedirectOrUpdate(e,t,n,o){const s=getRedirectUrl(e);if(s)await handleRedirect(s);else{const s=getUpdatedHTMLContent(e,n,o),a=(new DOMParser).parseFromString(t,"text/html");s&&a.body.insertAdjacentElement("afterbegin",s),updateBodyContent(a.body.outerHTML)}}function appendAfterbegin(e){if(!e)return;const t="afterbegin-8D95D";let n=document.getElementById(t);n?(n.innerHTML=e,document.body.insertAdjacentElement("afterbegin",n)):(n=document.createElement("div"),n.id=t,n.innerHTML=e,document.body.insertAdjacentElement("afterbegin",n))}function extractJson(e){const t=e?.match(/\{[\s\S]*\}/);return t?t[0]:null}function handleAfterRequest(e,t){if(!isJsonLike(e))return;const n=parseJson(e),o=t?parseJson(t):null,s=n.targets;Array.isArray(s)&&s.forEach((e=>{const{id:t,...n}=e,s=document.querySelector(t);let a={};if(o){for(const t in n)if(n.hasOwnProperty(t))switch(t){case"innerHTML":case"outerHTML":case"textContent":case"innerText":"response"===n[t]&&(a[t]=e.responseKey?o[e.responseKey]:o.response);break;default:a[t]=n[t];break}}else a=n;s&&updateElementAttributes(s,a)}))}async function handleRedirect(e){if(e)try{const t=new URL(e,window.location.origin);t.origin!==window.location.origin?window.location.href=e:(history.pushState(null,"",e),await handleNavigation())}catch(e){}}function debounce(e,t=300,n=!1){let o;return function(...s){const a=this;o&&clearTimeout(o),o=setTimeout((()=>{o=null,n||e.apply(a,s)}),t),n&&!o&&e.apply(a,s)}}function copyCode(e,t,n,o,s="img",a=2e3){if(!(e instanceof HTMLElement))return;const r=e.closest(`.${t}`)?.querySelector("pre code"),i=r?.textContent?.trim()||"";i?navigator.clipboard.writeText(i).then((()=>{const t=e.querySelector(s);if(t)for(const[e,n]of Object.entries(o))t.setAttribute(e,n);setTimeout((()=>{if(t)for(const[e,o]of Object.entries(n))t.setAttribute(e,o)}),a)}),(()=>{alert("Failed to copy command to clipboard")})):alert("Failed to find the code block to copy")}if((()=>{const e=EventTarget.prototype.addEventListener,t=new Map;EventTarget.prototype.addEventListener=function(n,o,s){t.has(this)||t.set(this,new Map);const a=t.get(this).get(n)||new Set;a.add(o),t.get(this).set(n,a),e.call(this,n,o,s)},EventTarget.prototype.removeAllEventListeners=function(e){t.has(this)&&t.get(this).has(e)&&(t.get(this).get(e).forEach((t=>{this.removeEventListener(e,t)})),t.get(this).delete(e))}})(),(e=>{const t=e.pushState,n=e.replaceState;e.pushState=function(n,o,s){const a=t.apply(e,arguments);return window.dispatchEvent(new Event("urlchange")),a},e.replaceState=function(t,o,s){const a=n.apply(e,arguments);return window.dispatchEvent(new Event("urlchange")),a}})(window.history),document.addEventListener("DOMContentLoaded",observeDOMChanges),document.addEventListener("DOMContentLoaded",attachWireFunctionEvents),window.addEventListener("popstate",(async()=>{await handleNavigation()})),window.addEventListener("urlchange",(()=>{})),null===store){class e{static instance=null;state;listeners;constructor(e={}){this.state=e,this.listeners=[]}static getInstance(t={}){return e.instance||(e.instance=new e(t),e.instance.loadState()),e.instance}setState(e){this.state={...this.state,...e},this.listeners.forEach((e=>e(this.state))),this.saveState()}subscribe(e){return this.listeners.push(e),e(this.state),()=>{this.listeners=this.listeners.filter((t=>t!==e))}}saveState(){localStorage.setItem("appState_59E13",JSON.stringify(this.state))}loadState(){const e=localStorage.getItem("appState_59E13");e&&(this.state=parseJson(e),this.listeners.forEach((e=>e(this.state))))}resetState(){this.state={},this.listeners.forEach((e=>e(this.state))),localStorage.removeItem("appState_59E13")}}store=e.getInstance()}