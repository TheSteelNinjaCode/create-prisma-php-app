"use strict";var eventAttributes=["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"];document.addEventListener("DOMContentLoaded",attachWireFunctionEvents);const optimisticUpdates=new Map,state={checkedElements:new Set};function attachWireFunctionEvents(){handleHiddenAttribute();document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((e=>{if(handleAnchorTag(e),eventAttributes.forEach((t=>{const n=e.getAttribute(t),a=t.slice(2);n&&(e.removeAttribute(t),handleDebounce(e,a,n))})),e instanceof HTMLFormElement){const t=e.getAttribute("onsubmit");t&&(e.removeAttribute("onsubmit"),handleDebounce(e,"submit",t))}}))}function handleHiddenAttribute(){document.querySelectorAll("[pp-hidden]").forEach((e=>{let t=e.getAttribute("pp-hidden");if(t)if(isJsonLike(t))try{t=t.replace(/'/g,'"');handleElementVisibility(e,JSON.parse(t))}catch(e){}else{const n=parseTime(t);n>0&&scheduleVisibilityChange(e,n,"hidden")}}))}function isJsonLike(e){return e.trim().startsWith("{")&&e.trim().endsWith("}")}function handleElementVisibility(e,t){const n=t.start?parseTime(t.start):0,a=t.end?parseTime(t.end):0;n>0?(e.style.visibility="hidden",scheduleVisibilityChange(e,n,"visible"),a>0&&scheduleVisibilityChange(e,n+a,"hidden")):a>0&&scheduleVisibilityChange(e,a,"hidden")}function scheduleVisibilityChange(e,t,n){setTimeout((()=>{requestAnimationFrame((()=>{e.style.visibility=n}))}),t)}function parseTime(e){if("number"==typeof e)return e;const t=e.match(/^(\d+)(ms|s|m)?$/);if(t){const e=parseInt(t[1],10);switch(t[2]||"ms"){case"ms":return e;case"s":return 1e3*e;case"m":return 60*e*1e3;default:return e}}return 0}async function handleDebounce(e,t,n){const a=e.getAttribute("pp-debounce"),o=e.getAttribute("pp-trigger"),s=async t=>{t.preventDefault();const a=saveOptimisticState(e);optimisticUpdates.set(e,a);try{o&&await invokeHandler(e,o),await invokeHandler(e,n)}catch(t){const n=optimisticUpdates.get(e);n&&revertOptimisticUpdate(e,n)}};if(a){const n=debounce(s,parseTime(a));e instanceof HTMLFormElement&&"submit"===t?e.addEventListener(t,(e=>{e.preventDefault(),n(e)})):e.addEventListener(t,n)}else e.addEventListener(t,s)}async function invokeHandler(e,t){try{const n=t.match(/^(\w+(\.\w+)*)\((.*)\)$/);if(n){const a=n[1],o=n[3],s=a.split("."),{context:c,methodName:i}=resolveContext(s);if("function"==typeof c[i]){const e=parseArguments(o);await c[i](...e)}else await handleParsedCallback(e,t)}else await handleParsedCallback(e,t)}catch(e){}}function resolveContext(e){let t=window;for(let n=0;n<e.length-1;n++)if(t=t[e[n]],!t)throw new Error(`Cannot find object ${e[n]} in the context.`);return{context:t,methodName:e[e.length-1]}}function parseArguments(e){return e?JSON.parse(`[${e}]`):[]}async function handleParsedCallback(e,t){const{funcName:n,data:a}=parseCallback(e,t);if(!n)return;const o=window[n];if("function"==typeof o){const e=Array.isArray(a.args)?a.args:[];await o(...e,a)}else await handleUndefinedFunction(e,n,a)}function extractStyles(e){const t={};for(let n=0;n<e.length;n++){const a=e[n];t[a]=e.getPropertyValue(a)}return t}function applyOptimisticUpdate(e,t){Object.entries(t.attributes).forEach((([t,n])=>{n?e.setAttribute(t,n):e.removeAttribute(t)})),Object.assign(e.style,t.styles),e.innerHTML=t.innerHTML||""}function revertOptimisticUpdate(e,t){"value"in t&&("checkbox"===e.type||"radio"===e.type?e.checked=!!t.value:e.value=t.value),"innerHTML"in t&&(e.innerHTML=t.innerHTML)}async function handleAnchorTag(e){e instanceof HTMLAnchorElement&&e.addEventListener("click",(e=>{const t=e.currentTarget,n=t.getAttribute("href"),a=t.getAttribute("target");if(!n||"_blank"===a||e.metaKey||e.ctrlKey)return;e.preventDefault();if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else try{history.pushState(null,"",n),window.dispatchEvent(new PopStateEvent("popstate",{state:null}))}catch(e){}}))}function updateDocumentContent(e){if(e.includes("<!DOCTYPE html>")){const t=(new DOMParser).parseFromString(e,"text/html");document.replaceChild(document.adoptNode(t.documentElement),document.documentElement)}else{saveState();const t=saveScrollPositions(),n=(new DOMParser).parseFromString(e,"text/html"),a=Array.from(n.body.querySelectorAll("script")),o=n.body;diffAndPatch(document.body,o),restoreState(),restoreScrollPositions(t),a.forEach((e=>{if(e.src)loadScript(e.src);else{const t=document.createElement("script");t.textContent=e.textContent,document.body.appendChild(t),document.body.removeChild(t)}}))}attachWireFunctionEvents()}function diffAndPatch(e,t){e.nodeType===t.nodeType?e.nodeType!==Node.TEXT_NODE||t.nodeType!==Node.TEXT_NODE?e instanceof HTMLElement&&t instanceof HTMLElement&&e.replaceWith(t):e.textContent!==t.textContent&&(e.textContent=t.textContent):e.parentNode?.replaceChild(t,e)}function updateAttributes(e,t){Array.from(t.attributes).forEach((t=>{e.getAttribute(t.name)!==t.value&&e.setAttribute(t.name,t.value)})),Array.from(e.attributes).forEach((n=>{t.hasAttribute(n.name)||e.removeAttribute(n.name)}))}function updateChildren(e,t){const n=e.childNodes,a=t.childNodes,o=Math.max(n.length,a.length);for(let t=0;t<o;t++){const o=n[t],s=a[t];o?s?diffAndPatch(o,s):e.removeChild(o):e.appendChild(s)}}function loadScript(e){const t=document.createElement("script");t.src=e,document.head.appendChild(t)}function saveState(){const e=document.activeElement;state.focusId=e?.id||e?.name,state.focusValue=e?.value,state.focusSelectionStart=e?.selectionStart,state.focusSelectionEnd=e?.selectionEnd,state.checkedElements.clear(),document.querySelectorAll('input[type="checkbox"]:checked').forEach((e=>{state.checkedElements.add(e.id||e.name)}))}function restoreState(){if(state.focusId){const e=document.getElementById(state.focusId)||document.querySelector(`[name="${state.focusId}"]`);e instanceof HTMLInputElement&&(e.focus(),"search"===e.type&&(e.value=state.focusValue||""),void 0!==state.focusSelectionStart&&null!==state.focusSelectionEnd&&e.setSelectionRange(state.focusSelectionStart||null,state.focusSelectionEnd||null))}state.checkedElements.forEach((e=>{const t=document.getElementById(e);t&&(t.checked=!0)}))}function saveScrollPositions(){const e={};return document.querySelectorAll("*").forEach((t=>{(t.scrollTop||t.scrollLeft)&&(e[getElementKey(t)]={scrollTop:t.scrollTop,scrollLeft:t.scrollLeft})})),e}function restoreScrollPositions(e){document.querySelectorAll("*").forEach((t=>{const n=getElementKey(t);e[n]&&(t.scrollTop=e[n].scrollTop,t.scrollLeft=e[n].scrollLeft)}))}function getElementKey(e){return e.id||e.className||e.tagName}async function pphpFetch(e,t){const n=await fetch(e,{...t,headers:{...t?.headers,"X-Requested-With":"XMLHttpRequest"}});return await n.text()}function parseCallback(e,t){let n={};const a=e.closest("form");if(a){new FormData(a).forEach(((e,t)=>{n[t]?Array.isArray(n[t])?n[t].push(e):n[t]=[n[t],e]:n[t]=e}))}else e instanceof HTMLInputElement?n=handleInputElement(e):(e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(n[e.name]=e.value);const o=t.match(/(\w+)\((.*)\)/);if(o){const e=o[1];let t=o[2].trim();if(t.startsWith("{")&&t.endsWith("}")){const e=t.replace(/'/g,'"');try{const t=JSON.parse(e);"object"==typeof t&&null!==t&&(n={...n,...t})}catch(e){}}else{const e=t.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((e=>e.trim().replace(/^['"]|['"]$/g,"")));n.args=e}return{funcName:e,data:n}}return{funcName:t,data:n}}function handleInputElement(e){let t={};return e.name?"checkbox"===e.type||"radio"===e.type?t[e.name]=e.checked:t[e.name]=e.value:"checkbox"===e.type||"radio"===e.type?t.value=e.checked:t.value=e.value,t}function captureState(e){const t={};for(const n of e.attributes)t[n.name]=n.value;return{attributes:t,styles:extractStyles(window.getComputedStyle(e)),innerHTML:e.innerHTML||""}}async function handleSuspenseElement(e){let t=e.getAttribute("pp-suspense")||"";if(t&&isJsonLike(t))try{(t=>{for(const n in t)if(t.hasOwnProperty(n))switch(n){case"innerHTML":case"outerHTML":case"textContent":case"innerText":e[n]=t[n];break;case"insertAdjacentHTML":e.insertAdjacentHTML(t.position||"beforeend",t[n]);break;case"insertAdjacentText":e.insertAdjacentText(t.position||"beforeend",t[n]);break;case"setAttribute":e.setAttribute(t.attrName,t[n]);break;case"removeAttribute":e.removeAttribute(t[n]);break;case"className":e.className=t[n];break;case"classList.add":e.classList.add(...t[n].split(","));break;case"classList.remove":e.classList.remove(...t[n].split(","));break;case"classList.toggle":e.classList.toggle(t[n]);break;case"classList.replace":const[a,o]=t[n].split(",");e.classList.replace(a,o);break;case"dataset":e.dataset[t.attrName]=t[n];break;case"style":Object.assign(e.style,t[n]);break;case"value":e.value=t[n];break;case"checked":e.checked=t[n];break;default:e.setAttribute(n,t[n])}})(JSON.parse(t.replace(/'/g,'"')))}catch(e){}else t&&(e.textContent=t)}async function handleUndefinedFunction(e,t,n){handleSuspenseElement(e);const a={callback:t,...n},o={method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(a)},s={method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify({secondRequest:!0})};try{const e=window.location.pathname,t=await pphpFetch(e,o),n=await pphpFetch(e,s);if(t.includes("redirect_7F834=")){const e=t.split("=")[1];await handleRedirect(e)}else{updateDocumentContent(t+n)}}catch(e){revertOptimisticUpdate(document.body,captureState(document.body))}}function saveOptimisticState(e){return{value:e.value||e.checked||"",attributes:Array.from(e.attributes).reduce(((e,t)=>(e[t.name]=t.value,e)),{}),styles:extractStyles(window.getComputedStyle(e)),innerHTML:e.innerHTML}}async function handleRedirect(e){if(e){history.pushState(null,"",e),window.dispatchEvent(new PopStateEvent("popstate",{state:null}));try{const t=await fetch(e,{headers:{"X-Requested-With":"XMLHttpRequest"}});updateDocumentContent(await t.text())}catch(e){}}}function debounce(e,t=300,n=!1){let a;return function(...o){const s=this;a&&clearTimeout(a),a=setTimeout((()=>{a=null,n||e.apply(s,o)}),t),n&&!a&&e.apply(s,o)}}function copyCode(e,t,n,a,o=2e3){const s=e.closest(`.${t}`)?.querySelector("pre code"),c=s?.textContent?.trim()||"";c?navigator.clipboard.writeText(c).then((()=>{const t=e.querySelector("i");t&&(t.className=a),setTimeout((()=>{t&&(t.className=n)}),o)}),(()=>{alert("Failed to copy command to clipboard")})):alert("Failed to find the code block to copy")}window.addEventListener("popstate",(async()=>{try{updateDocumentContent(await pphpFetch(window.location.href))}catch(e){}}));let store=null;if(void 0===store){class e{static instance=null;state;listeners;constructor(e={}){this.state=e,this.listeners=[]}static getInstance(t={}){return e.instance||(e.instance=new e(t),e.instance.loadState()),e.instance}setState(e,t=!1){this.state={...this.state,...e},this.listeners.forEach((e=>e(this.state))),t&&this.saveState()}subscribe(e){return this.listeners.push(e),e(this.state),()=>{this.listeners=this.listeners.filter((t=>t!==e))}}saveState(){localStorage.setItem("appState",JSON.stringify(this.state))}loadState(){const e=localStorage.getItem("appState");e&&(this.state=JSON.parse(e),this.listeners.forEach((e=>e(this.state))))}resetState(e=!1){this.state={},this.listeners.forEach((e=>e(this.state))),e&&localStorage.removeItem("appState")}}store=e.getInstance()}