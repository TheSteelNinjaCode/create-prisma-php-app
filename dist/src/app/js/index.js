(()=>{const e=EventTarget.prototype.addEventListener,t=EventTarget.prototype.removeEventListener,n=new Map;EventTarget.prototype.addEventListener=function(t,s,o){n.has(this)||n.set(this,new Map);const i=n.get(this).get(t)||new Set;i.add(s),n.get(this).set(t,i),e.call(this,t,s,o)},EventTarget.prototype.removeEventListener=function(e,s,o){if(n.has(this)&&n.get(this).has(e)){const t=n.get(this).get(e);t&&(t.delete(s),0===t.size&&n.get(this).delete(e))}t.call(this,e,s,o)},EventTarget.prototype.removeAllEventListeners=function(e){if(n.has(this)&&n.get(this).has(e)){const s=n.get(this).get(e);s&&(s.forEach((n=>{t.call(this,e,n)})),n.get(this).delete(e))}}})();class PPHP{props={};static _instance;eventHandlers;redirectRegex=/redirect_7F834\s*=\s*(\/[^\s]*)/;isNavigating=!1;responseData=null;state={checkedElements:new Set};activeAbortController=null;_rawProps={};constructor(){this.eventHandlers=new Set(["onclick","ondblclick","onmousedown","onmouseup","onmouseover","onmousemove","onmouseout","onwheel","onkeypress","onkeydown","onkeyup","onfocus","onblur","onchange","oninput","onselect","onsubmit","onreset","onresize","onscroll","onload","onunload","onabort","onerror","onbeforeunload","oncopy","oncut","onpaste","ondrag","ondragstart","ondragend","ondragover","ondragenter","ondragleave","ondrop","oncontextmenu","ontouchstart","ontouchmove","ontouchend","ontouchcancel","onpointerdown","onpointerup","onpointermove","onpointerover","onpointerout","onpointerenter","onpointerleave","onpointercancel"]),this.handlePopState(),this.props=this.makeReactive(this._rawProps)}static get instance(){return PPHP._instance||(PPHP._instance=new PPHP),PPHP._instance}makeSafeEvaluator(e){const t=Array.from(new Set(e.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g)?.filter((e=>!["true","false","null","undefined"].includes(e)))??[])).map((e=>`const ${e} = ctx["${e}"];`)).join("\n");return new Function("ctx",`\n      "use strict";\n      ${t}\n      return ${e};\n    `)}makeReactive(e,t=[]){const n=this;return e instanceof Map||e instanceof Set?e:new Proxy(e,{get(e,s){const o=e[s];return"object"==typeof o&&null!==o?n.makeReactive(o,[...t,s.toString()]):o},set(e,s,o){e[s]=o;const i=[...t,s.toString()].join(".");return document.querySelectorAll(`[pp-bind="${i}"]`).forEach((e=>{e.textContent=o})),document.querySelectorAll("[pp-bind-expr]").forEach((e=>{const t=e.getAttribute("pp-bind-expr");if(!t)return;const o=t.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);if(!o||o.includes(s.toString()))try{const s=n.makeSafeEvaluator(t)(n.props);e.textContent=s}catch(e){}})),document.querySelectorAll("*").forEach((e=>{Array.from(e.attributes).forEach((t=>{if(!t.name.startsWith("pp-bind-"))return;const s=t.value.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,"&").replace(/^{{\s*|\s*}}$/g,"");if(!s.includes(i))return;const o=t.name.replace(/^(pp-bind-)+/,"");try{const t=n.makeSafeEvaluator(s)(n.props),i=null!=t?t.toString():"",a="value"===o?i:i.trim();let r;if("value"===o)r=a;else{const t=e.getAttribute(`pp-bind-original-data-${o}`)??(()=>{const t=e.getAttribute(o)?.trim()??"";return e.setAttribute(`pp-bind-original-data-${o}`,t),t})();r=t,a&&(r=t?`${t} ${a}`.trim():a)}"value"===o?e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement?e.value=r:e.setAttribute(o,r):"checked"===o&&e instanceof HTMLInputElement?e.checked="true"===r:e.setAttribute(o,r)}catch(e){}}))})),!0}})}handlePopState(){window.addEventListener("popstate",(async()=>{await this.handleNavigation()}))}attachWireFunctionEvents(){this.handleHiddenAttribute();document.querySelectorAll("button, input, select, textarea, a, form, label, div, span").forEach((e=>{if(this.handleAnchorTag(e),Array.from(e.attributes).filter((e=>this.eventHandlers.has(e.name))).forEach((t=>{const n=t.name.slice(2),s=t.value;e instanceof HTMLInputElement&&this.handleInputAppendParams(e,n),s&&(e.removeAttribute(t.name),this.handleDebounce(e,n,s))})),e instanceof HTMLFormElement){const t=e.getAttribute("onsubmit");t&&(e.removeAttribute("onsubmit"),this.handleDebounce(e,"submit",t))}}))}async handleDebounce(e,t,n){e.removeEventListener(t,(()=>{}));const s=e.getAttribute("pp-debounce")||"",o=e.getAttribute("pp-before-request")||"",i=e.getAttribute("pp-after-request")||"",a=async t=>{t.preventDefault();try{o&&await this.invokeHandler(e,o,t),await this.invokeHandler(e,n,t),i&&"@close"!==i&&await this.invokeHandler(e,i,t),this.handlerAutofocusAttribute()}catch(e){}};if(s){const n=this.parseTime(s),o=this.debounce(a,n);e instanceof HTMLFormElement&&"submit"===t?e.addEventListener(t,(e=>{e.preventDefault(),o(e)})):e.addEventListener(t,o)}else e.addEventListener(t,a)}debounce(e,t=300,n=!1){let s;return function(...o){const i=this;s&&clearTimeout(s),s=setTimeout((()=>{s=null,n||e.apply(i,o)}),t),n&&!s&&e.apply(i,o)}}handlerAutofocusAttribute(){const e=document.activeElement;if(e&&e!==document.body)return;const t=this.state?.focusId;if(!t)return;const n=document.querySelectorAll("[pp-autofocus]");let s=!1;n.forEach((e=>{if(s)return;const t=e.getAttribute("pp-autofocus");if(!t||!this.isJsonLike(t))return;const n=this.parseJson(t);if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement){const t=["text","search","tel","url","password"];if(e instanceof HTMLInputElement)if(t.includes(e.type))if("number"===e.type){e.type="text";const t=e.value.length||0;e.setSelectionRange(t,t),e.type="number"}else this.setCursorPosition(e,n);else;else e instanceof HTMLTextAreaElement&&this.setCursorPosition(e,n)}e.focus(),s=!0}))}async invokeHandler(e,t,n){try{const s=t.match(/^(\w+(\.\w+)*)\((.*)\)$/);if(s){const o=s[1],i=s[3],a=o.split("."),{context:r,methodName:c}=this.resolveContext(a);if("function"==typeof r[c])if(this.isJsonLike(i)){const t=this.parseJson(i);t.element=e,t.event=n;const s=[t];await r[c](...s)}else new Function("event",t).call(e,n);else await this.handleParsedCallback(e,t)}else if(t.includes("=")){new Function("event","props",`with (new Proxy(props, {\n            has: (target, key) => key === 'pphp' ? false : true\n          })) { ${t} }`).call(e,n,pphp.props)}else await this.handleParsedCallback(e,t)}catch(e){}}async handleParsedCallback(e,t){const{funcName:n,data:s}=this.parseCallback(e,t);if(!n)return;const o=this[n],i=window[n];let a;if("function"==typeof o?a=o:"function"==typeof i&&(a=i),"function"==typeof a){const t=e.hasAttribute("pp-after-request"),n=Array.isArray(s.args)?s.args:[],o=this.responseData?this.parseJson(this.responseData):{response:this.responseData};let i={args:n,element:e,data:s};t&&(i={...i,...o}),await a.call(this,i)}else this.responseData=null,this.responseData=await this.handleUndefinedFunction(e,n,s)}async handleUndefinedFunction(e,t,n){const s={callback:t,...n},o=this.createFetchOptions(s),i=this.createFetchOptions({secondRequestC69CD:!0,...this.getUrlParams()});try{this.saveElementOriginalState(e),this.handleSuspenseElement(e);const s=new URL(window.location.href);let a="",r="",c={success:!1};const l=e.querySelector("input[type='file']");if(l){if(a=await this.fetchFileWithData(s.href,t,l,n),r=this.extractJson(a)||"",r)try{c=this.parseJson(r)}catch(e){}}else{const e=await this.fetch(s.href,o);if(a=await e.text(),this.getRedirectUrl(a))return void await this.redirect(this.getRedirectUrl(a)||"");if(r=this.extractJson(a)||"",r)try{c=this.parseJson(r)}catch(e){}}const h=e.getAttribute("pp-before-request")||"",u=e.getAttribute("pp-after-request")||"";if((h||u&&c.success)&&this.restoreSuspenseElement(e),h||u){let e="";if(c.success){e=a.replace(r,"")}else e=a;if(this.appendAfterbegin(e),!u&&!c.success)return}if(u&&c.success){this.handleAfterRequest(u,r);const e=a.replace(r,"");return this.appendAfterbegin(e),r}if("@close"===u)return c.success?r:void 0;const d=await this.fetch(s.href,i),p=await d.text();if(this.getRedirectUrl(p))return void await this.redirect(this.getRedirectUrl(p)||"");await this.handleResponseRedirectOrUpdate(a,p,r,c)}catch(e){}}handleAfterRequest(e,t){if(!this.isJsonLike(e))return;const n=this.parseJson(e),s=t?this.parseJson(t):null,o=n.targets;Array.isArray(o)&&o.forEach((e=>{const{id:t,...n}=e,o=document.querySelector(t);let i={};if(s){for(const t in n)if(n.hasOwnProperty(t))switch(t){case"innerHTML":case"outerHTML":case"textContent":case"innerText":"response"===n[t]&&(i[t]=e.responseKey?s[e.responseKey]:s.response);break;default:i[t]=n[t];break}}else i=n;o&&this.updateElementAttributes(o,i)}))}async handleResponseRedirectOrUpdate(e,t,n,s){const o=this.getUpdatedHTMLContent(e,n,s),i=(new DOMParser).parseFromString(t,"text/html");o&&i.body.insertAdjacentElement("afterbegin",o),this.updateBodyContent(i.body.outerHTML)}getUpdatedHTMLContent(e,t,n){const s=document.createElement("div");if(s.id="afterbegin-8D95D",n&&t?.success){const t=e.replace(n,"");s.innerHTML=t}else s.innerHTML=e;return s.innerHTML?s:null}async updateBodyContent(e){const t=this.saveScrollPositions();this.saveState();const n=(new DOMParser).parseFromString(e,"text/html");document.removeAllEventListeners("PPBodyLoaded"),await this.appendCallbackResponse(n),this.restoreState(),this.restoreScrollPositions(t),this.attachWireFunctionEvents(),document.dispatchEvent(new Event("PPBodyLoaded"))}restoreState(){if(this.state.focusId){const e=document.getElementById(this.state.focusId)||document.querySelector(`[name="${this.state.focusId}"]`);if(e instanceof HTMLInputElement){const t=e.value.length||0;void 0!==this.state.focusSelectionStart&&null!==this.state.focusSelectionEnd&&e.setSelectionRange(t,t),this.state.focusValue&&("checkbox"===e.type||"radio"===e.type?e.checked=!!this.state.focusChecked:"number"===e.type||"email"===e.type?(e.type="text",e.setSelectionRange(t,t),e.type="number"===e.type?"number":"email"):"date"===e.type||"month"===e.type||"week"===e.type||"time"===e.type||"datetime-local"===e.type||"color"===e.type||"file"===e.type||""!==e.value&&(e.value=this.state.focusValue)),e.focus()}else if(e instanceof HTMLTextAreaElement){const t=e.value.length||0;void 0!==this.state.focusSelectionStart&&null!==this.state.focusSelectionEnd&&e.setSelectionRange(t,t),this.state.focusValue&&""!==e.value&&(e.value=this.state.focusValue),e.focus()}else e instanceof HTMLSelectElement&&(this.state.focusValue&&""!==e.value&&(e.value=this.state.focusValue),e.focus())}this.state.checkedElements.forEach((e=>{const t=document.getElementById(e);t&&(t.checked=!0)}))}async appendCallbackResponse(e){const t=e.getElementById("afterbegin-8D95D");if(t){const e=document.getElementById("afterbegin-8D95D");e?e.innerHTML=t.innerHTML:document.body.insertAdjacentHTML("afterbegin",t.outerHTML)}await this.populateDocumentBody(e)}saveState(){const e=document.activeElement;this.state.focusId=e?.id||e?.name,this.state.focusValue=e?.value,this.state.focusChecked=e?.checked,this.state.focusType=e?.type,this.state.focusSelectionStart=e?.selectionStart,this.state.focusSelectionEnd=e?.selectionEnd,this.state.isSuspense=e.hasAttribute("pp-suspense"),this.state.checkedElements.clear(),document.querySelectorAll('input[type="checkbox"]:checked').forEach((e=>{this.state.checkedElements.add(e.id||e.name)})),document.querySelectorAll('input[type="radio"]:checked').forEach((e=>{this.state.checkedElements.add(e.id||e.name)}))}updateElementAttributes(e,t){for(const n in t)if(t.hasOwnProperty(n))switch(n){case"innerHTML":case"outerHTML":case"textContent":case"innerText":e[n]=this.decodeHTML(t[n]);break;case"insertAdjacentHTML":e.insertAdjacentHTML(t.position||"beforeend",this.decodeHTML(t[n].html));break;case"insertAdjacentText":e.insertAdjacentText(t.position||"beforeend",this.decodeHTML(t[n].text));break;case"setAttribute":e.setAttribute(t.attrName,this.decodeHTML(t[n]));break;case"removeAttribute":e.removeAttribute(t[n]);break;case"className":e.className=this.decodeHTML(t[n]);break;case"classList.add":e.classList.add(...this.decodeHTML(t[n]).split(","));break;case"classList.remove":e.classList.remove(...this.decodeHTML(t[n]).split(","));break;case"classList.toggle":e.classList.toggle(this.decodeHTML(t[n]));break;case"classList.replace":const[s,o]=this.decodeHTML(t[n]).split(",");e.classList.replace(s,o);break;case"dataset":e.dataset[t.attrName]=this.decodeHTML(t[n]);break;case"style":Object.assign(e.style,t[n]);break;case"value":e.value=this.decodeHTML(t[n]);break;case"checked":e.checked=t[n];break;default:e.setAttribute(n,this.decodeHTML(t[n]))}}decodeHTML(e){const t=document.createElement("textarea");return t.innerHTML=e,t.value}appendAfterbegin(e){if(!e)return;const t="afterbegin-8D95D";let n=document.getElementById(t);n?(n.innerHTML=e,document.body.insertAdjacentElement("afterbegin",n)):(n=document.createElement("div"),n.id=t,n.innerHTML=e,document.body.insertAdjacentElement("afterbegin",n))}restoreSuspenseElement(e){const t=e.getAttribute("pp-original-state");if(e.hasAttribute("pp-suspense")&&t){const n=(e,t)=>{for(const n in t)t.hasOwnProperty(n)&&("textContent"===n?e.textContent=t[n]:"innerHTML"===n?e.innerHTML=t[n]:"disabled"===n?!0===t[n]?e.setAttribute("disabled","true"):e.removeAttribute("disabled"):e.setAttribute(n,t[n]));for(const n of Array.from(e.attributes))t.hasOwnProperty(n.name)||e.removeAttribute(n.name)},s=(e,t)=>{for(const s in t)if(t.hasOwnProperty(s))for(const t of Array.from(e.elements))if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-original-state")||"";if(e){if(this.isJsonLike(e)){const s=this.parseJson(e);n(t,s)}else o(t,e);t.removeAttribute("pp-original-state")}}},o=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t},i=(e,t)=>{e instanceof HTMLFormElement?s(e,t):n(e,t)};try{const o=this.parseJson(t);if(o)if(e instanceof HTMLFormElement){const t=e.id;if(t){const e=document.querySelector(`[form="${t}"]`);if(e){const t=e.getAttribute("pp-original-state");if(t&&this.isJsonLike(t)){const s=this.parseJson(t);n(e,s)}}}const o=new FormData(e),i={};if(o.forEach(((e,t)=>{i[t]=e})),s(e,i),e.hasAttribute("pp-suspense")){const t=e.getAttribute("pp-suspense")||"";if(this.parseJson(t).disabled)for(const t of Array.from(e.elements))(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)&&t.removeAttribute("disabled")}}else if(o.targets){o.targets.forEach((e=>{const{id:t,...n}=e,s=document.querySelector(t);s&&i(s,n)}));const{targets:t,...s}=o;n(e,s)}else{const{empty:t,...s}=o;n(e,s)}}catch(e){}}e.querySelectorAll("[pp-suspense]").forEach((e=>this.restoreSuspenseElement(e))),e.removeAttribute("pp-original-state")}extractJson(e){const t=e?.match(/\{[\s\S]*\}/);return t?t[0]:null}getRedirectUrl(e){const t=e.match(this.redirectRegex);return t?t[1]:null}async fetchFileWithData(e,t,n,s={}){const o=new FormData,i=n.files;if(i)for(let e=0;e<i.length;e++)o.append("file[]",i[e]);o.append("callback",t);for(const e in s)s.hasOwnProperty(e)&&o.append(e,s[e]);const a=await this.fetch(e,{method:"POST",headers:{HTTP_PPHP_WIRE_REQUEST:"true"},body:o});return await a.text()}async handleSuspenseElement(e){let t=e.getAttribute("pp-suspense")||"";const n=(e,t)=>{for(const n in t)if(t.hasOwnProperty(n))for(const t of e.elements)if(t instanceof HTMLInputElement||t instanceof HTMLButtonElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement){const e=t.getAttribute("pp-suspense")||"";if(e)if(this.isJsonLike(e)){const n=this.parseJson(e);"disabled"!==n.onsubmit&&this.updateElementAttributes(t,n),n.targets&&n.targets.forEach((e=>{const{id:t,...n}=e,s=document.querySelector(t);s&&o(s,n)}))}else s(t,e)}},s=(e,t)=>{e instanceof HTMLInputElement?e.value=t:e.textContent=t},o=(e,t)=>{e instanceof HTMLFormElement?n(e,t):this.updateElementAttributes(e,t)};try{if(t&&this.isJsonLike(t)){const s=this.parseJson(t);if(s)if(e instanceof HTMLFormElement){const t=new FormData(e),o={};t.forEach(((e,t)=>{o[t]=e})),s.disabled&&this.toggleFormElements(e,!0);const{disabled:i,...a}=s;this.updateElementAttributes(e,a),n(e,o)}else if(s.targets){s.targets.forEach((e=>{const{id:t,...n}=e,s=document.querySelector(t);s&&o(s,n)}));const{targets:t,...n}=s;this.updateElementAttributes(e,n)}else{if("disabled"===s.empty&&""===e.value)return;const{empty:t,...n}=s;this.updateElementAttributes(e,n)}}else if(t)s(e,t);else if(e instanceof HTMLFormElement){const t=new FormData(e),s={};t.forEach(((e,t)=>{s[t]=e})),n(e,s)}}catch(e){}}toggleFormElements(e,t){Array.from(e.elements).forEach((e=>{(e instanceof HTMLInputElement||e instanceof HTMLButtonElement||e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(e.disabled=t)}))}saveElementOriginalState(e){if(e.hasAttribute("pp-suspense")&&!e.hasAttribute("pp-original-state")){const t={};e.textContent&&(t.textContent=e.textContent.trim()),e.innerHTML&&(t.innerHTML=e.innerHTML.trim()),(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)&&(t.value=e.value);for(let n=0;n<e.attributes.length;n++){const s=e.attributes[n];t[s.name]=s.value}e.setAttribute("pp-original-state",JSON.stringify(t))}if(e instanceof HTMLFormElement){let t=null;const n=e.id;n&&(t=document.querySelector(`[form="${n}"]`)),n&&t||(t=Array.from(e.elements).find((e=>e instanceof HTMLButtonElement||e instanceof HTMLInputElement))),t&&(t.hasAttribute("pp-original-state")||this.saveElementOriginalState(t))}e.querySelectorAll("[pp-suspense]").forEach((e=>this.saveElementOriginalState(e)))}getUrlParams(){const e={};return new URLSearchParams(window.location.search).forEach(((t,n)=>{e[n]=t})),e}createFetchOptions(e){return{method:"POST",headers:{"Content-Type":"application/json",HTTP_PPHP_WIRE_REQUEST:"true"},body:JSON.stringify(e)}}parseCallback(e,t){let n={};const s=e.closest("form");if(s){new FormData(s).forEach(((e,t)=>{n[t]?Array.isArray(n[t])?n[t].push(e):n[t]=[n[t],e]:n[t]=e}))}else e instanceof HTMLInputElement?n=this.handleInputElement(e):(e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&(n[e.name]=e.value);const o=t.match(/(\w+)\((.*)\)/);if(o){const e=o[1];let t=o[2].trim();if(t.startsWith("{")&&t.endsWith("}"))try{const e=this.parseJson(t);"object"==typeof e&&null!==e&&(n={...n,...e})}catch(e){}else{const e=t.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/).map((e=>e.trim().replace(/^['"]|['"]$/g,"")));n.args=e}return{funcName:e,data:n}}return{funcName:t,data:n}}handleInputElement(e){let t={};if(e.name)if("checkbox"===e.type)t[e.name]={value:e.value,checked:e.checked};else if("radio"===e.type){const n=document.querySelector(`input[name="${e.name}"]:checked`);t[e.name]=n?n.value:null}else t[e.name]=e.value;else"checkbox"===e.type||"radio"===e.type?t.value=e.checked:t.value=e.value;return t}resolveContext(e){let t=window;for(let n=0;n<e.length-1;n++)if(t=t[e[n]],!t)throw new Error(`Cannot find object ${e[n]} in the context.`);return{context:t,methodName:e[e.length-1]}}setCursorPosition(e,t){if(t.start)e.setSelectionRange(0,0);else if(t.end){const t=e.value.length||0;e.setSelectionRange(t,t)}else if(t.length){const n=parseInt(t.length,10)||0;e.setSelectionRange(n,n)}}handleInputAppendParams(e,t){const n=e.getAttribute("pp-append-params"),s=e.getAttribute("pp-append-params-sync");if("true"===n){if("true"===s){const t=e.name||e.id;if(t){const n=new URL(window.location.href),s=new URLSearchParams(n.search);s.has(t)&&(e.value=s.get(t)||"")}}e.addEventListener(t,(e=>{const t=e.currentTarget,n=t.value,s=new URL(window.location.href),o=new URLSearchParams(s.search),i=t.name||t.id;if(i){n?o.set(i,n):o.delete(i);const e=o.toString()?`${s.pathname}?${o.toString()}`:s.pathname;history.replaceState(null,"",e)}}))}}handleHiddenAttribute(){const e=document.querySelectorAll("[pp-visibility]"),t=document.querySelectorAll("[pp-display]");e.forEach((e=>this.handleVisibilityElementAttribute(e,"pp-visibility",this.handleElementVisibility))),t.forEach((e=>this.handleVisibilityElementAttribute(e,"pp-display",this.handleElementDisplay)))}handleVisibilityElementAttribute(e,t,n){const s=e.getAttribute(t);if(s)if(this.isJsonLike(s)){n(e,this.parseJson(s))}else{const n=this.parseTime(s);if(n>0){const s="pp-visibility"===t?"visibility":"display",o="visibility"===s?"hidden":"none";this.scheduleChange(e,n,s,o)}}}handleElementVisibility(e,t){this.handleElementChange(e,t,"visibility","hidden","visible")}handleElementDisplay(e,t){this.handleElementChange(e,t,"display","none","block")}handleElementChange(e,t,n,s,o){const i=t.start?this.parseTime(t.start):0,a=t.end?this.parseTime(t.end):0;i>0?(e.style[n]=s,this.scheduleChange(e,i,n,o),a>0&&this.scheduleChange(e,i+a,n,s)):a>0&&this.scheduleChange(e,a,n,s)}handleAnchorTag(e){e instanceof HTMLAnchorElement&&e.addEventListener("click",(async e=>{const t=e.currentTarget,n=t.getAttribute("href"),s=t.getAttribute("target");if(n&&"_blank"!==s&&!e.metaKey&&!e.ctrlKey&&(e.preventDefault(),!this.isNavigating)){this.isNavigating=!0;try{if(/^(https?:)?\/\//i.test(n)&&!n.startsWith(window.location.origin))window.location.href=n;else{const e=t.getAttribute("pp-append-params");if(n.startsWith("?")&&"true"===e){const e=new URL(window.location.href),t=new URLSearchParams(e.search);let s="";const[o,i]=n.split("#");i&&(s=`#${i}`);new URLSearchParams(o.split("?")[1]).forEach(((e,n)=>{t.set(n,e)}));const a=`${e.pathname}?${t.toString()}${s}`;history.pushState(null,"",a)}else{const[e,t]=n.split("#"),s=`${e}${t?`#${t}`:""}`;history.pushState(null,"",s)}const s=n.indexOf("#");if(-1!==s){const e=n.slice(s+1),t=document.getElementById(e);if(t)t.scrollIntoView({behavior:"smooth"});else{await this.handleNavigation();const t=document.getElementById(e);t&&t.scrollIntoView({behavior:"smooth"})}}else await this.handleNavigation()}}catch(e){}finally{this.isNavigating=!1}}}))}async handleNavigation(){try{const e=document.getElementById("loading-file-1B87E");if(e){const t=this.findLoadingElement(e,window.location.pathname);t&&await this.updateContentWithTransition(t)}const t=await this.fetch(window.location.href);if(!t.ok)return;const n=await t.text(),s=n.match(this.redirectRegex);if(s&&s[1])return void await this.redirect(s[1]);await this.updateDocumentContent(n)}catch(e){}}findLoadingElement(e,t){let n=t;for(;;){const t=e.querySelector(`div[pp-loading-url='${n}']`);if(t)return t;if("/"===n)break;const s=n.lastIndexOf("/");n=s<=0?"/":n.substring(0,s)}return e.querySelector("div[pp-loading-url='/' ]")}async updateContentWithTransition(e){const t=document.querySelector("[pp-loading-content='true']")||document.body;if(!t)return;const{fadeIn:n,fadeOut:s}=this.parseTransition(e);await this.fadeOut(t,s),t.innerHTML=e.innerHTML,this.fadeIn(t,n)}parseTransition(e){let t=250,n=250;const s=e.querySelector("[pp-loading-transition]")?.getAttribute("pp-loading-transition");if(s)try{const e=this.parseJson(s);t=this.parseTime(e.fadeIn??t),n=this.parseTime(e.fadeOut??n)}catch(e){}return{fadeIn:t,fadeOut:n}}fadeOut(e,t){return new Promise((n=>{e.style.transition=`opacity ${t}ms ease-out`,e.style.opacity="0",setTimeout((()=>{e.style.transition="",n()}),t)}))}fadeIn(e,t){e.style.transition=`opacity ${t}ms ease-in`,e.style.opacity="1",setTimeout((()=>{e.style.transition=""}),t)}async updateDocumentContent(e){const t=this.saveScrollPositions(),n=(new DOMParser).parseFromString(e,"text/html"),s="pp-dynamic-script",o="pp-dynamic-link";document.head.querySelectorAll("[pp-dynamic-meta]").forEach((e=>e.remove()));document.head.querySelectorAll("[pp-dynamic-link]").forEach((e=>e.remove()));document.head.querySelectorAll("[pp-dynamic-script]").forEach((e=>e.remove()));document.removeAllEventListeners("PPBodyLoaded"),await(async e=>{Array.from(e.head.children).forEach((e=>{const t=e.tagName;if("SCRIPT"===t&&e.hasAttribute(s)){const t=document.createElement("script");Array.from(e.attributes).forEach((e=>t.setAttribute(e.name,e.value))),e.textContent&&(t.textContent=e.textContent),document.head.appendChild(t)}else if("META"===t){if(e.getAttribute("charset")||"viewport"===e.getAttribute("name"))return;const t=e.name,n=e.getAttribute("property"),s=document.head.querySelector(t?`meta[name="${t}"]`:`meta[property="${n}"]`),o=document.head.querySelector("title");s?document.head.replaceChild(e.cloneNode(!0),s):o?.nextSibling?document.head.insertBefore(e.cloneNode(!0),o.nextSibling):document.head.appendChild(e.cloneNode(!0))}else if("TITLE"===t){const t=document.head.querySelector("title");t?document.head.replaceChild(e.cloneNode(!0),t):document.head.appendChild(e.cloneNode(!0))}else if("LINK"===t){const t=t=>{const n=document.head.querySelector('link[rel="icon"]');if(n)document.head.replaceChild(e.cloneNode(!0),n);else{const e=document.createElement("link");e.rel="icon",e.href=t,document.head.appendChild(e)}};if("icon"===e.getAttribute("rel")){t(e.href)}else if(e.hasAttribute(o)){const t=e.cloneNode(!0);document.head.appendChild(t)}}})),await this.populateDocumentBody(e)})(n),this.restoreScrollPositions(t),this.attachWireFunctionEvents(),document.dispatchEvent(new Event("PPBodyLoaded"))}restoreScrollPositions(e){requestAnimationFrame((()=>{const t=e.window;t&&window.scrollTo(t.scrollLeft,t.scrollTop),document.querySelectorAll("*").forEach((t=>{const n=this.getElementKey(t);e[n]&&(t.scrollTop=e[n].scrollTop,t.scrollLeft=e[n].scrollLeft)}))}))}async populateDocumentBody(e){try{const t=e.body.cloneNode(!0);this.manageScriptTags(t),document.body.replaceWith(t)}catch(e){}}manageScriptTags(e,t){const n=e.querySelectorAll("script"),s=t?.querySelectorAll("script")||n;n.forEach(((e,t)=>{const n=document.createElement("script"),o=s[t]||e;Array.from(o.attributes).forEach((e=>{n.setAttribute(e.name,e.value)})),o.hasAttribute("src")||(n.textContent=o.textContent),e.parentNode?.replaceChild(n,e)}))}saveScrollPositions(){const e={window:{scrollTop:window.scrollY||document.documentElement.scrollTop,scrollLeft:window.scrollX||document.documentElement.scrollLeft}};return document.querySelectorAll("*").forEach((t=>{(t.scrollTop||t.scrollLeft)&&(e[this.getElementKey(t)]={scrollTop:t.scrollTop,scrollLeft:t.scrollLeft})})),e}getElementKey(e){return e.id||e.className||e.tagName}async redirect(e){if(e)try{const t=new URL(e,window.location.origin);t.origin!==window.location.origin?window.location.href=e:(history.pushState(null,"",e),await this.handleNavigation())}catch(e){}}abortActiveRequest(){this.activeAbortController&&this.activeAbortController.abort()}async fetch(e,t,n=!1){let s;return n?(this.activeAbortController&&this.activeAbortController.abort(),this.activeAbortController=new AbortController,s=this.activeAbortController):s=new AbortController,fetch(e,{...t,signal:s.signal,headers:{...t?.headers,"X-Requested-With":"XMLHttpRequest"}})}isJsonLike(e){return"string"==typeof e&&((e=e.trim()).startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))}parseJson(e){try{return JSON5.parse(e)}catch(e){return null}}parseTime(e){if("number"==typeof e)return e;const t=e.match(/^(\d+)(ms|s|m)?$/);if(t){const e=parseInt(t[1],10);switch(t[2]||"ms"){case"ms":return e;case"s":return 1e3*e;case"m":return 60*e*1e3;default:return e}}return 0}scheduleChange(e,t,n,s){setTimeout((()=>{requestAnimationFrame((()=>{e.style[n]=s}))}),t)}observeDOMChanges(){new MutationObserver((e=>{for(const t of e)"childList"===t.type&&t.addedNodes.length>0&&this.attachWireFunctionEvents()})).observe(document.body,{childList:!0,subtree:!0})}async fetchFunction(e,t={},n=!1){try{const s={callback:e,...t},o=window.location.href;let i;if(Object.keys(s).some((e=>{const t=s[e];return t instanceof File||t instanceof FileList&&t.length>0}))){const e=new FormData;Object.keys(s).forEach((t=>{const n=s[t];n instanceof File?e.append(t,n):n instanceof FileList?Array.from(n).forEach((n=>e.append(t,n))):e.append(t,n)})),i={method:"POST",headers:{HTTP_PPHP_WIRE_REQUEST:"true"},body:e}}else i=this.createFetchOptions(s);const a=await this.fetch(o,i,n);if(!a.ok)throw new Error(`Fetch failed with status: ${a.status} ${a.statusText}`);const r=await a.text();try{return JSON.parse(r)}catch{return r}}catch(e){throw new Error("Failed to fetch data.")}}async sync(...e){try{const t=this.saveScrollPositions();this.saveState();const n=e.length>0?e.map((e=>`pp-sync="${e}"`)):['pp-sync="true"'],s=this.createFetchOptions({secondRequestC69CD:!0,...this.getUrlParams()}),o=await this.fetch(window.location.href,s),i=await o.text(),a=(new DOMParser).parseFromString(i,"text/html");n.forEach((e=>{const t=document.querySelectorAll(`[${e}]`),n=a.body.querySelectorAll(`[${e}]`);t.forEach(((e,t)=>{const s=n[t];s&&(e.innerHTML=s.innerHTML,this.reRunScripts(e),document.dispatchEvent(new Event("PPBodyLoaded")))}))})),this.restoreState(),this.restoreScrollPositions(t),document.removeAllEventListeners("PPBodyLoaded"),document.dispatchEvent(new Event("PPBodyLoaded"))}catch(e){}}async fetchAndUpdateBodyContent(){const e=this.createFetchOptions({secondRequestC69CD:!0,...this.getUrlParams()});this.abortActiveRequest();const t=await this.fetch(window.location.href,e,!0),n=await t.text();await this.updateBodyContent(n)}reRunScripts(e){e.querySelectorAll("script").forEach((e=>{const t=document.createElement("script");Array.from(e.attributes).forEach((e=>{t.setAttribute(e.name,e.value)})),e.hasAttribute("src")||(t.textContent=e.textContent),e.parentNode?.replaceChild(t,e)}))}copyCode(e,t,n,s,o="img",i=2e3){if(!(e instanceof HTMLElement))return;const a=e.closest(`.${t}`)?.querySelector("pre code"),r=a?.textContent?.trim()||"";r?navigator.clipboard.writeText(r).then((()=>{const t=e.querySelector(o);if(t)for(const[e,n]of Object.entries(s))e in t?t[e]=n:t.setAttribute(e,n);setTimeout((()=>{if(t)for(const[e,s]of Object.entries(n))e in t?t[e]=s:t.setAttribute(e,s)}),i)}),(()=>{alert("Failed to copy command to clipboard")})):alert("Failed to find the code block to copy")}getCookie(e){return document.cookie.split("; ").find((t=>t.startsWith(e+"=")))?.split("=")[1]||null}}class PPHPLocalStore{static instance=null;state;listeners;pphp;STORAGE_KEY;constructor(e={}){this.state=e,this.listeners=[],this.pphp=PPHP.instance,this.STORAGE_KEY=this.pphp.getCookie("pphp_local_store_key")||"pphp_local_store_59e13",this.loadState()}static getInstance(e={}){return PPHPLocalStore.instance||(PPHPLocalStore.instance=new PPHPLocalStore(e)),PPHPLocalStore.instance}setState(e,t=!1){if(this.state={...this.state,...e},this.listeners.forEach((e=>e(this.state))),this.saveState(),t){const e=localStorage.getItem(this.STORAGE_KEY);e&&this.pphp.fetchFunction(this.STORAGE_KEY,{[this.STORAGE_KEY]:e})}}saveState(){localStorage.setItem(this.STORAGE_KEY,JSON.stringify(this.state))}loadState(){const e=localStorage.getItem(this.STORAGE_KEY);e&&(this.state=this.pphp.parseJson(e),this.listeners.forEach((e=>e(this.state))))}resetState(e,t=!1){if(e?(delete this.state[e],this.saveState()):(this.state={},localStorage.removeItem(this.STORAGE_KEY)),this.listeners.forEach((e=>e(this.state))),t){const t=e?localStorage.getItem(this.STORAGE_KEY):null;this.pphp.fetchFunction(this.STORAGE_KEY,{[this.STORAGE_KEY]:t})}}}
// Initialize the PPHP instance
document.addEventListener("PPBodyLoaded", () => {
    PPHP.instance.attachWireFunctionEvents();
    PPHP.instance.observeDOMChanges();
});
// Dispatch the PPBodyLoaded event when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    document.dispatchEvent(new Event("PPBodyLoaded"));
});
var pphp = PPHP.instance;
var store = PPHPLocalStore.getInstance();