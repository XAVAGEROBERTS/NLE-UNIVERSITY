import{d as He,g as et,e as tt,f as at,r as L,b as ot,s as oe,R as o}from"./index-tPt1CnYW.js";var ce={exports:{}},X={},he={exports:{}},ve,Oe;function nt(){if(Oe)return ve;Oe=1;var p="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";return ve=p,ve}var ge,Se;function rt(){if(Se)return ge;Se=1;var p=nt();function s(){}function b(){}return b.resetWarningCache=s,ge=function(){function n(w,e,N,E,m,r){if(r!==p){var f=new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");throw f.name="Invariant Violation",f}}n.isRequired=n;function c(){return n}var v={array:n,bigint:n,bool:n,func:n,number:n,object:n,string:n,symbol:n,any:n,arrayOf:c,element:n,elementType:n,instanceOf:c,node:n,objectOf:c,oneOf:c,oneOfType:c,shape:c,exact:c,checkPropTypes:b,resetWarningCache:s};return v.PropTypes=v,v},ge}var ke;function je(){return ke||(ke=1,he.exports=rt()()),he.exports}var de={exports:{}},z={},ue={exports:{}},Te;function Be(){return Te||(Te=1,(function(p,s){Object.defineProperty(s,"__esModule",{value:!0}),s.default=m;var b="none",n="contents",c=/^(input|select|textarea|button|object|iframe)$/;function v(r,f){return f.getPropertyValue("overflow")!=="visible"||r.scrollWidth<=0&&r.scrollHeight<=0}function w(r){var f=r.offsetWidth<=0&&r.offsetHeight<=0;if(f&&!r.innerHTML)return!0;try{var d=window.getComputedStyle(r),y=d.getPropertyValue("display");return f?y!==n&&v(r,d):y===b}catch{return console.warn("Failed to inspect element style"),!1}}function e(r){for(var f=r,d=r.getRootNode&&r.getRootNode();f&&f!==document.body;){if(d&&f===d&&(f=d.host.parentNode),w(f))return!1;f=f.parentNode}return!0}function N(r,f){var d=r.nodeName.toLowerCase(),y=c.test(d)&&!r.disabled||d==="a"&&r.href||f;return y&&e(r)}function E(r){var f=r.getAttribute("tabindex");f===null&&(f=void 0);var d=isNaN(f);return(d||f>=0)&&N(r,!d)}function m(r){var f=[].slice.call(r.querySelectorAll("*"),0).reduce(function(d,y){return d.concat(y.shadowRoot?m(y.shadowRoot):[y])},[]);return f.filter(E)}p.exports=s.default})(ue,ue.exports)),ue.exports}var Re;function it(){if(Re)return z;Re=1,Object.defineProperty(z,"__esModule",{value:!0}),z.resetState=w,z.log=e,z.handleBlur=N,z.handleFocus=E,z.markForFocusLater=m,z.returnFocus=r,z.popWithoutFocus=f,z.setupScopedFocus=d,z.teardownScopedFocus=y;var p=Be(),s=b(p);function b(O){return O&&O.__esModule?O:{default:O}}var n=[],c=null,v=!1;function w(){n=[]}function e(){}function N(){v=!0}function E(){if(v){if(v=!1,!c)return;setTimeout(function(){if(!c.contains(document.activeElement)){var O=(0,s.default)(c)[0]||c;O.focus()}},0)}}function m(){n.push(document.activeElement)}function r(){var O=arguments.length>0&&arguments[0]!==void 0?arguments[0]:!1,R=null;try{n.length!==0&&(R=n.pop(),R.focus({preventScroll:O}));return}catch{console.warn(["You tried to return focus to",R,"but it is not in the DOM anymore"].join(" "))}}function f(){n.length>0&&n.pop()}function d(O){c=O,window.addEventListener?(window.addEventListener("blur",N,!1),document.addEventListener("focus",E,!0)):(window.attachEvent("onBlur",N),document.attachEvent("onFocus",E))}function y(){c=null,window.addEventListener?(window.removeEventListener("blur",N),document.removeEventListener("focus",E)):(window.detachEvent("onBlur",N),document.detachEvent("onFocus",E))}return z}var fe={exports:{}},Me;function lt(){return Me||(Me=1,(function(p,s){Object.defineProperty(s,"__esModule",{value:!0}),s.default=w;var b=Be(),n=c(b);function c(e){return e&&e.__esModule?e:{default:e}}function v(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:document;return e.activeElement.shadowRoot?v(e.activeElement.shadowRoot):e.activeElement}function w(e,N){var E=(0,n.default)(e);if(!E.length){N.preventDefault();return}var m=void 0,r=N.shiftKey,f=E[0],d=E[E.length-1],y=v();if(e===y){if(!r)return;m=d}if(d===y&&!r&&(m=f),f===y&&r&&(m=d),m){N.preventDefault(),m.focus();return}var O=/(\bChrome\b|\bSafari\b)\//.exec(navigator.userAgent),R=O!=null&&O[1]!="Chrome"&&/\biPod\b|\biPad\b/g.exec(navigator.userAgent)==null;if(R){var P=E.indexOf(y);if(P>-1&&(P+=r?-1:1),m=E[P],typeof m>"u"){N.preventDefault(),m=r?d:f,m.focus();return}N.preventDefault(),m.focus()}}p.exports=s.default})(fe,fe.exports)),fe.exports}var H={},be,Pe;function st(){if(Pe)return be;Pe=1;var p=function(){};return be=p,be}var Y={},ye={exports:{}};var De;function ct(){return De||(De=1,(function(p){(function(){var s=!!(typeof window<"u"&&window.document&&window.document.createElement),b={canUseDOM:s,canUseWorkers:typeof Worker<"u",canUseEventListeners:s&&!!(window.addEventListener||window.attachEvent),canUseViewport:s&&!!window.screen};p.exports?p.exports=b:window.ExecutionEnvironment=b})()})(ye)),ye.exports}var Ae;function xe(){if(Ae)return Y;Ae=1,Object.defineProperty(Y,"__esModule",{value:!0}),Y.canUseDOM=Y.SafeNodeList=Y.SafeHTMLCollection=void 0;var p=ct(),s=b(p);function b(v){return v&&v.__esModule?v:{default:v}}var n=s.default,c=n.canUseDOM?window.HTMLElement:{};return Y.SafeHTMLCollection=n.canUseDOM?window.HTMLCollection:{},Y.SafeNodeList=n.canUseDOM?window.NodeList:{},Y.canUseDOM=n.canUseDOM,Y.default=c,Y}var Le;function Ve(){if(Le)return H;Le=1,Object.defineProperty(H,"__esModule",{value:!0}),H.resetState=v,H.log=w,H.assertNodeList=e,H.setElement=N,H.validateElement=E,H.hide=m,H.show=r,H.documentNotReadyOrSSRTesting=f;var p=st(),s=n(p),b=xe();function n(d){return d&&d.__esModule?d:{default:d}}var c=null;function v(){c&&(c.removeAttribute?c.removeAttribute("aria-hidden"):c.length!=null?c.forEach(function(d){return d.removeAttribute("aria-hidden")}):document.querySelectorAll(c).forEach(function(d){return d.removeAttribute("aria-hidden")})),c=null}function w(){}function e(d,y){if(!d||!d.length)throw new Error("react-modal: No elements were found for selector "+y+".")}function N(d){var y=d;if(typeof y=="string"&&b.canUseDOM){var O=document.querySelectorAll(y);e(O,y),y=O}return c=y||c,c}function E(d){var y=d||c;return y?Array.isArray(y)||y instanceof HTMLCollection||y instanceof NodeList?y:[y]:((0,s.default)(!1,["react-modal: App element is not defined.","Please use `Modal.setAppElement(el)` or set `appElement={el}`.","This is needed so screen readers don't see main content","when modal is opened. It is not recommended, but you can opt-out","by setting `ariaHideApp={false}`."].join(" ")),[])}function m(d){var y=!0,O=!1,R=void 0;try{for(var P=E(d)[Symbol.iterator](),F;!(y=(F=P.next()).done);y=!0){var D=F.value;D.setAttribute("aria-hidden","true")}}catch(U){O=!0,R=U}finally{try{!y&&P.return&&P.return()}finally{if(O)throw R}}}function r(d){var y=!0,O=!1,R=void 0;try{for(var P=E(d)[Symbol.iterator](),F;!(y=(F=P.next()).done);y=!0){var D=F.value;D.removeAttribute("aria-hidden")}}catch(U){O=!0,R=U}finally{try{!y&&P.return&&P.return()}finally{if(O)throw R}}}function f(){c=null}return H}var Q={},Fe;function dt(){if(Fe)return Q;Fe=1,Object.defineProperty(Q,"__esModule",{value:!0}),Q.resetState=n,Q.log=c;var p={},s={};function b(E,m){E.classList.remove(m)}function n(){var E=document.getElementsByTagName("html")[0];for(var m in p)b(E,p[m]);var r=document.body;for(var f in s)b(r,s[f]);p={},s={}}function c(){}var v=function(m,r){return m[r]||(m[r]=0),m[r]+=1,r},w=function(m,r){return m[r]&&(m[r]-=1),r},e=function(m,r,f){f.forEach(function(d){v(r,d),m.add(d)})},N=function(m,r,f){f.forEach(function(d){w(r,d),r[d]===0&&m.remove(d)})};return Q.add=function(m,r){return e(m.classList,m.nodeName.toLowerCase()=="html"?p:s,r.split(" "))},Q.remove=function(m,r){return N(m.classList,m.nodeName.toLowerCase()=="html"?p:s,r.split(" "))},Q}var te={},Ue;function Ye(){if(Ue)return te;Ue=1,Object.defineProperty(te,"__esModule",{value:!0}),te.log=n,te.resetState=c;function p(v,w){if(!(v instanceof w))throw new TypeError("Cannot call a class as a function")}var s=function v(){var w=this;p(this,v),this.register=function(e){w.openInstances.indexOf(e)===-1&&(w.openInstances.push(e),w.emit("register"))},this.deregister=function(e){var N=w.openInstances.indexOf(e);N!==-1&&(w.openInstances.splice(N,1),w.emit("deregister"))},this.subscribe=function(e){w.subscribers.push(e)},this.emit=function(e){w.subscribers.forEach(function(N){return N(e,w.openInstances.slice())})},this.openInstances=[],this.subscribers=[]},b=new s;function n(){console.log("portalOpenInstances ----------"),console.log(b.openInstances.length),b.openInstances.forEach(function(v){return console.log(v)}),console.log("end portalOpenInstances ----------")}function c(){b=new s}return te.default=b,te}var ne={},qe;function ut(){if(qe)return ne;qe=1,Object.defineProperty(ne,"__esModule",{value:!0}),ne.resetState=w,ne.log=e;var p=Ye(),s=b(p);function b(m){return m&&m.__esModule?m:{default:m}}var n=void 0,c=void 0,v=[];function w(){for(var m=[n,c],r=0;r<m.length;r++){var f=m[r];f&&f.parentNode&&f.parentNode.removeChild(f)}n=c=null,v=[]}function e(){console.log("bodyTrap ----------"),console.log(v.length);for(var m=[n,c],r=0;r<m.length;r++){var f=m[r],d=f||{};console.log(d.nodeName,d.className,d.id)}console.log("edn bodyTrap ----------")}function N(){v.length!==0&&v[v.length-1].focusContent()}function E(m,r){!n&&!c&&(n=document.createElement("div"),n.setAttribute("data-react-modal-body-trap",""),n.style.position="absolute",n.style.opacity="0",n.setAttribute("tabindex","0"),n.addEventListener("focus",N),c=n.cloneNode(),c.addEventListener("focus",N)),v=r,v.length>0?(document.body.firstChild!==n&&document.body.insertBefore(n,document.body.firstChild),document.body.lastChild!==c&&document.body.appendChild(c)):(n.parentElement&&n.parentElement.removeChild(n),c.parentElement&&c.parentElement.removeChild(c))}return s.default.subscribe(E),ne}var ze;function ft(){return ze||(ze=1,(function(p,s){Object.defineProperty(s,"__esModule",{value:!0});var b=Object.assign||function(l){for(var i=1;i<arguments.length;i++){var C=arguments[i];for(var t in C)Object.prototype.hasOwnProperty.call(C,t)&&(l[t]=C[t])}return l},n=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(l){return typeof l}:function(l){return l&&typeof Symbol=="function"&&l.constructor===Symbol&&l!==Symbol.prototype?"symbol":typeof l},c=(function(){function l(i,C){for(var t=0;t<C.length;t++){var a=C[t];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(i,a.key,a)}}return function(i,C,t){return C&&l(i.prototype,C),t&&l(i,t),i}})(),v=He(),w=je(),e=j(w),N=it(),E=U(N),m=lt(),r=j(m),f=Ve(),d=U(f),y=dt(),O=U(y),R=xe(),P=j(R),F=Ye(),D=j(F);ut();function U(l){if(l&&l.__esModule)return l;var i={};if(l!=null)for(var C in l)Object.prototype.hasOwnProperty.call(l,C)&&(i[C]=l[C]);return i.default=l,i}function j(l){return l&&l.__esModule?l:{default:l}}function I(l,i){if(!(l instanceof i))throw new TypeError("Cannot call a class as a function")}function J(l,i){if(!l)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return i&&(typeof i=="object"||typeof i=="function")?i:l}function Z(l,i){if(typeof i!="function"&&i!==null)throw new TypeError("Super expression must either be null or a function, not "+typeof i);l.prototype=Object.create(i&&i.prototype,{constructor:{value:l,enumerable:!1,writable:!0,configurable:!0}}),i&&(Object.setPrototypeOf?Object.setPrototypeOf(l,i):l.__proto__=i)}var W={overlay:"ReactModal__Overlay",content:"ReactModal__Content"},B=function(i){return i.code==="Tab"||i.keyCode===9},_=function(i){return i.code==="Escape"||i.keyCode===27},g=0,S=(function(l){Z(i,l);function i(C){I(this,i);var t=J(this,(i.__proto__||Object.getPrototypeOf(i)).call(this,C));return t.setOverlayRef=function(a){t.overlay=a,t.props.overlayRef&&t.props.overlayRef(a)},t.setContentRef=function(a){t.content=a,t.props.contentRef&&t.props.contentRef(a)},t.afterClose=function(){var a=t.props,h=a.appElement,u=a.ariaHideApp,x=a.htmlOpenClassName,T=a.bodyOpenClassName,A=a.parentSelector,ee=A&&A().ownerDocument||document;T&&O.remove(ee.body,T),x&&O.remove(ee.getElementsByTagName("html")[0],x),u&&g>0&&(g-=1,g===0&&d.show(h)),t.props.shouldFocusAfterRender&&(t.props.shouldReturnFocusAfterClose?(E.returnFocus(t.props.preventScroll),E.teardownScopedFocus()):E.popWithoutFocus()),t.props.onAfterClose&&t.props.onAfterClose(),D.default.deregister(t)},t.open=function(){t.beforeOpen(),t.state.afterOpen&&t.state.beforeClose?(clearTimeout(t.closeTimer),t.setState({beforeClose:!1})):(t.props.shouldFocusAfterRender&&(E.setupScopedFocus(t.node),E.markForFocusLater()),t.setState({isOpen:!0},function(){t.openAnimationFrame=requestAnimationFrame(function(){t.setState({afterOpen:!0}),t.props.isOpen&&t.props.onAfterOpen&&t.props.onAfterOpen({overlayEl:t.overlay,contentEl:t.content})})}))},t.close=function(){t.props.closeTimeoutMS>0?t.closeWithTimeout():t.closeWithoutTimeout()},t.focusContent=function(){return t.content&&!t.contentHasFocus()&&t.content.focus({preventScroll:!0})},t.closeWithTimeout=function(){var a=Date.now()+t.props.closeTimeoutMS;t.setState({beforeClose:!0,closesAt:a},function(){t.closeTimer=setTimeout(t.closeWithoutTimeout,t.state.closesAt-Date.now())})},t.closeWithoutTimeout=function(){t.setState({beforeClose:!1,isOpen:!1,afterOpen:!1,closesAt:null},t.afterClose)},t.handleKeyDown=function(a){B(a)&&(0,r.default)(t.content,a),t.props.shouldCloseOnEsc&&_(a)&&(a.stopPropagation(),t.requestClose(a))},t.handleOverlayOnClick=function(a){t.shouldClose===null&&(t.shouldClose=!0),t.shouldClose&&t.props.shouldCloseOnOverlayClick&&(t.ownerHandlesClose()?t.requestClose(a):t.focusContent()),t.shouldClose=null},t.handleContentOnMouseUp=function(){t.shouldClose=!1},t.handleOverlayOnMouseDown=function(a){!t.props.shouldCloseOnOverlayClick&&a.target==t.overlay&&a.preventDefault()},t.handleContentOnClick=function(){t.shouldClose=!1},t.handleContentOnMouseDown=function(){t.shouldClose=!1},t.requestClose=function(a){return t.ownerHandlesClose()&&t.props.onRequestClose(a)},t.ownerHandlesClose=function(){return t.props.onRequestClose},t.shouldBeClosed=function(){return!t.state.isOpen&&!t.state.beforeClose},t.contentHasFocus=function(){return document.activeElement===t.content||t.content.contains(document.activeElement)},t.buildClassName=function(a,h){var u=(typeof h>"u"?"undefined":n(h))==="object"?h:{base:W[a],afterOpen:W[a]+"--after-open",beforeClose:W[a]+"--before-close"},x=u.base;return t.state.afterOpen&&(x=x+" "+u.afterOpen),t.state.beforeClose&&(x=x+" "+u.beforeClose),typeof h=="string"&&h?x+" "+h:x},t.attributesFromObject=function(a,h){return Object.keys(h).reduce(function(u,x){return u[a+"-"+x]=h[x],u},{})},t.state={afterOpen:!1,beforeClose:!1},t.shouldClose=null,t.moveFromContentToOverlay=null,t}return c(i,[{key:"componentDidMount",value:function(){this.props.isOpen&&this.open()}},{key:"componentDidUpdate",value:function(t,a){this.props.isOpen&&!t.isOpen?this.open():!this.props.isOpen&&t.isOpen&&this.close(),this.props.shouldFocusAfterRender&&this.state.isOpen&&!a.isOpen&&this.focusContent()}},{key:"componentWillUnmount",value:function(){this.state.isOpen&&this.afterClose(),clearTimeout(this.closeTimer),cancelAnimationFrame(this.openAnimationFrame)}},{key:"beforeOpen",value:function(){var t=this.props,a=t.appElement,h=t.ariaHideApp,u=t.htmlOpenClassName,x=t.bodyOpenClassName,T=t.parentSelector,A=T&&T().ownerDocument||document;x&&O.add(A.body,x),u&&O.add(A.getElementsByTagName("html")[0],u),h&&(g+=1,d.hide(a)),D.default.register(this)}},{key:"render",value:function(){var t=this.props,a=t.id,h=t.className,u=t.overlayClassName,x=t.defaultStyles,T=t.children,A=h?{}:x.content,ee=u?{}:x.overlay;if(this.shouldBeClosed())return null;var re={ref:this.setOverlayRef,className:this.buildClassName("overlay",u),style:b({},ee,this.props.style.overlay),onClick:this.handleOverlayOnClick,onMouseDown:this.handleOverlayOnMouseDown},ie=b({id:a,ref:this.setContentRef,style:b({},A,this.props.style.content),className:this.buildClassName("content",h),tabIndex:"-1",onKeyDown:this.handleKeyDown,onMouseDown:this.handleContentOnMouseDown,onMouseUp:this.handleContentOnMouseUp,onClick:this.handleContentOnClick,role:this.props.role,"aria-label":this.props.contentLabel},this.attributesFromObject("aria",b({modal:!0},this.props.aria)),this.attributesFromObject("data",this.props.data||{}),{"data-testid":this.props.testId}),le=this.props.contentElement(ie,T);return this.props.overlayElement(re,le)}}]),i})(v.Component);S.defaultProps={style:{overlay:{},content:{}},defaultStyles:{}},S.propTypes={isOpen:e.default.bool.isRequired,defaultStyles:e.default.shape({content:e.default.object,overlay:e.default.object}),style:e.default.shape({content:e.default.object,overlay:e.default.object}),className:e.default.oneOfType([e.default.string,e.default.object]),overlayClassName:e.default.oneOfType([e.default.string,e.default.object]),parentSelector:e.default.func,bodyOpenClassName:e.default.string,htmlOpenClassName:e.default.string,ariaHideApp:e.default.bool,appElement:e.default.oneOfType([e.default.instanceOf(P.default),e.default.instanceOf(R.SafeHTMLCollection),e.default.instanceOf(R.SafeNodeList),e.default.arrayOf(e.default.instanceOf(P.default))]),onAfterOpen:e.default.func,onAfterClose:e.default.func,onRequestClose:e.default.func,closeTimeoutMS:e.default.number,shouldFocusAfterRender:e.default.bool,shouldCloseOnOverlayClick:e.default.bool,shouldReturnFocusAfterClose:e.default.bool,preventScroll:e.default.bool,role:e.default.string,contentLabel:e.default.string,aria:e.default.object,data:e.default.object,children:e.default.node,shouldCloseOnEsc:e.default.bool,overlayRef:e.default.func,contentRef:e.default.func,id:e.default.string,overlayElement:e.default.func,contentElement:e.default.func,testId:e.default.string},s.default=S,p.exports=s.default})(de,de.exports)),de.exports}function $e(){var p=this.constructor.getDerivedStateFromProps(this.props,this.state);p!=null&&this.setState(p)}function Ke(p){function s(b){var n=this.constructor.getDerivedStateFromProps(p,b);return n??null}this.setState(s.bind(this))}function Ge(p,s){try{var b=this.props,n=this.state;this.props=p,this.state=s,this.__reactInternalSnapshotFlag=!0,this.__reactInternalSnapshot=this.getSnapshotBeforeUpdate(b,n)}finally{this.props=b,this.state=n}}$e.__suppressDeprecationWarning=!0;Ke.__suppressDeprecationWarning=!0;Ge.__suppressDeprecationWarning=!0;function pt(p){var s=p.prototype;if(!s||!s.isReactComponent)throw new Error("Can only polyfill class components");if(typeof p.getDerivedStateFromProps!="function"&&typeof s.getSnapshotBeforeUpdate!="function")return p;var b=null,n=null,c=null;if(typeof s.componentWillMount=="function"?b="componentWillMount":typeof s.UNSAFE_componentWillMount=="function"&&(b="UNSAFE_componentWillMount"),typeof s.componentWillReceiveProps=="function"?n="componentWillReceiveProps":typeof s.UNSAFE_componentWillReceiveProps=="function"&&(n="UNSAFE_componentWillReceiveProps"),typeof s.componentWillUpdate=="function"?c="componentWillUpdate":typeof s.UNSAFE_componentWillUpdate=="function"&&(c="UNSAFE_componentWillUpdate"),b!==null||n!==null||c!==null){var v=p.displayName||p.name,w=typeof p.getDerivedStateFromProps=="function"?"getDerivedStateFromProps()":"getSnapshotBeforeUpdate()";throw Error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

`+v+" uses "+w+" but also contains the following legacy lifecycles:"+(b!==null?`
  `+b:"")+(n!==null?`
  `+n:"")+(c!==null?`
  `+c:"")+`

The above lifecycles should be removed. Learn more about this warning here:
https://fb.me/react-async-component-lifecycle-hooks`)}if(typeof p.getDerivedStateFromProps=="function"&&(s.componentWillMount=$e,s.componentWillReceiveProps=Ke),typeof s.getSnapshotBeforeUpdate=="function"){if(typeof s.componentDidUpdate!="function")throw new Error("Cannot polyfill getSnapshotBeforeUpdate() for components that do not define componentDidUpdate() on the prototype");s.componentWillUpdate=Ge;var e=s.componentDidUpdate;s.componentDidUpdate=function(E,m,r){var f=this.__reactInternalSnapshotFlag?this.__reactInternalSnapshot:r;e.call(this,E,m,f)}}return p}const mt=Object.freeze(Object.defineProperty({__proto__:null,polyfill:pt},Symbol.toStringTag,{value:"Module"})),ht=et(mt);var Ie;function vt(){if(Ie)return X;Ie=1,Object.defineProperty(X,"__esModule",{value:!0}),X.bodyOpenClassName=X.portalClassName=void 0;var p=Object.assign||function(_){for(var g=1;g<arguments.length;g++){var S=arguments[g];for(var l in S)Object.prototype.hasOwnProperty.call(S,l)&&(_[l]=S[l])}return _},s=(function(){function _(g,S){for(var l=0;l<S.length;l++){var i=S[l];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(g,i.key,i)}}return function(g,S,l){return S&&_(g.prototype,S),l&&_(g,l),g}})(),b=He(),n=R(b),c=tt(),v=R(c),w=je(),e=R(w),N=ft(),E=R(N),m=Ve(),r=O(m),f=xe(),d=R(f),y=ht;function O(_){if(_&&_.__esModule)return _;var g={};if(_!=null)for(var S in _)Object.prototype.hasOwnProperty.call(_,S)&&(g[S]=_[S]);return g.default=_,g}function R(_){return _&&_.__esModule?_:{default:_}}function P(_,g){if(!(_ instanceof g))throw new TypeError("Cannot call a class as a function")}function F(_,g){if(!_)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return g&&(typeof g=="object"||typeof g=="function")?g:_}function D(_,g){if(typeof g!="function"&&g!==null)throw new TypeError("Super expression must either be null or a function, not "+typeof g);_.prototype=Object.create(g&&g.prototype,{constructor:{value:_,enumerable:!1,writable:!0,configurable:!0}}),g&&(Object.setPrototypeOf?Object.setPrototypeOf(_,g):_.__proto__=g)}var U=X.portalClassName="ReactModalPortal",j=X.bodyOpenClassName="ReactModal__Body--open",I=f.canUseDOM&&v.default.createPortal!==void 0,J=function(g){return document.createElement(g)},Z=function(){return I?v.default.createPortal:v.default.unstable_renderSubtreeIntoContainer};function W(_){return _()}var B=(function(_){D(g,_);function g(){var S,l,i,C;P(this,g);for(var t=arguments.length,a=Array(t),h=0;h<t;h++)a[h]=arguments[h];return C=(l=(i=F(this,(S=g.__proto__||Object.getPrototypeOf(g)).call.apply(S,[this].concat(a))),i),i.removePortal=function(){!I&&v.default.unmountComponentAtNode(i.node);var u=W(i.props.parentSelector);u&&u.contains(i.node)?u.removeChild(i.node):console.warn('React-Modal: "parentSelector" prop did not returned any DOM element. Make sure that the parent element is unmounted to avoid any memory leaks.')},i.portalRef=function(u){i.portal=u},i.renderPortal=function(u){var x=Z(),T=x(i,n.default.createElement(E.default,p({defaultStyles:g.defaultStyles},u)),i.node);i.portalRef(T)},l),F(i,C)}return s(g,[{key:"componentDidMount",value:function(){if(f.canUseDOM){I||(this.node=J("div")),this.node.className=this.props.portalClassName;var l=W(this.props.parentSelector);l.appendChild(this.node),!I&&this.renderPortal(this.props)}}},{key:"getSnapshotBeforeUpdate",value:function(l){var i=W(l.parentSelector),C=W(this.props.parentSelector);return{prevParent:i,nextParent:C}}},{key:"componentDidUpdate",value:function(l,i,C){if(f.canUseDOM){var t=this.props,a=t.isOpen,h=t.portalClassName;l.portalClassName!==h&&(this.node.className=h);var u=C.prevParent,x=C.nextParent;x!==u&&(u.removeChild(this.node),x.appendChild(this.node)),!(!l.isOpen&&!a)&&!I&&this.renderPortal(this.props)}}},{key:"componentWillUnmount",value:function(){if(!(!f.canUseDOM||!this.node||!this.portal)){var l=this.portal.state,i=Date.now(),C=l.isOpen&&this.props.closeTimeoutMS&&(l.closesAt||i+this.props.closeTimeoutMS);C?(l.beforeClose||this.portal.closeWithTimeout(),setTimeout(this.removePortal,C-i)):this.removePortal()}}},{key:"render",value:function(){if(!f.canUseDOM||!I)return null;!this.node&&I&&(this.node=J("div"));var l=Z();return l(n.default.createElement(E.default,p({ref:this.portalRef,defaultStyles:g.defaultStyles},this.props)),this.node)}}],[{key:"setAppElement",value:function(l){r.setElement(l)}}]),g})(b.Component);return B.propTypes={isOpen:e.default.bool.isRequired,style:e.default.shape({content:e.default.object,overlay:e.default.object}),portalClassName:e.default.string,bodyOpenClassName:e.default.string,htmlOpenClassName:e.default.string,className:e.default.oneOfType([e.default.string,e.default.shape({base:e.default.string.isRequired,afterOpen:e.default.string.isRequired,beforeClose:e.default.string.isRequired})]),overlayClassName:e.default.oneOfType([e.default.string,e.default.shape({base:e.default.string.isRequired,afterOpen:e.default.string.isRequired,beforeClose:e.default.string.isRequired})]),appElement:e.default.oneOfType([e.default.instanceOf(d.default),e.default.instanceOf(f.SafeHTMLCollection),e.default.instanceOf(f.SafeNodeList),e.default.arrayOf(e.default.instanceOf(d.default))]),onAfterOpen:e.default.func,onRequestClose:e.default.func,closeTimeoutMS:e.default.number,ariaHideApp:e.default.bool,shouldFocusAfterRender:e.default.bool,shouldCloseOnOverlayClick:e.default.bool,shouldReturnFocusAfterClose:e.default.bool,preventScroll:e.default.bool,parentSelector:e.default.func,aria:e.default.object,data:e.default.object,role:e.default.string,contentLabel:e.default.string,shouldCloseOnEsc:e.default.bool,overlayRef:e.default.func,contentRef:e.default.func,id:e.default.string,overlayElement:e.default.func,contentElement:e.default.func},B.defaultProps={isOpen:!1,portalClassName:U,bodyOpenClassName:j,role:"dialog",ariaHideApp:!0,closeTimeoutMS:0,shouldFocusAfterRender:!0,shouldCloseOnEsc:!0,shouldCloseOnOverlayClick:!0,shouldReturnFocusAfterClose:!0,preventScroll:!1,parentSelector:function(){return document.body},overlayElement:function(g,S){return n.default.createElement("div",g,S)},contentElement:function(g,S){return n.default.createElement("div",g,S)}},B.defaultStyles={overlay:{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(255, 255, 255, 0.75)"},content:{position:"absolute",top:"40px",left:"40px",right:"40px",bottom:"40px",border:"1px solid #ccc",background:"#fff",overflow:"auto",WebkitOverflowScrolling:"touch",borderRadius:"4px",outline:"none",padding:"20px"}},(0,y.polyfill)(B),X.default=B,X}var We;function gt(){return We||(We=1,(function(p,s){Object.defineProperty(s,"__esModule",{value:!0});var b=vt(),n=c(b);function c(v){return v&&v.__esModule?v:{default:v}}s.default=n.default,p.exports=s.default})(ce,ce.exports)),ce.exports}var bt=gt();const Xe=at(bt);typeof window<"u"&&Xe.setAppElement("#root");const _t=()=>{const[p,s]=L.useState([]),[b,n]=L.useState(!0),[c,v]=L.useState(null),[w,e]=L.useState(null),[N,E]=L.useState(!1),[m,r]=L.useState(!1),[f,d]=L.useState(!1),[y,O]=L.useState(!1),[R,P]=L.useState(""),F=L.useRef(null),D=L.useRef({}),{user:U}=ot(),[j,I]=L.useState({});L.useEffect(()=>{U?.email&&J()},[U]),L.useEffect(()=>{const a=async()=>{for(const h of p)if(!j[h.id]&&h.videoSrc){const u=await Z(h.videoSrc);u&&I(x=>({...x,[h.id]:u}))}};p.length>0&&a()},[p]),L.useEffect(()=>()=>{Object.values(D.current).forEach(a=>{a&&(a.pause(),a.currentTime=0,a.src="")})},[]),L.useEffect(()=>{if(y){const a=setTimeout(()=>{O(!1)},3e3);return()=>clearTimeout(a)}},[y]);const J=async()=>{try{n(!0),v(null);const{data:a,error:h}=await oe.from("students").select("id, program_code, academic_year, year_of_study, semester").eq("email",U.email).single();if(h||!a)throw new Error("Unable to load your profile. Please contact admin.");if(!a.program_code||!a.academic_year||!a.year_of_study||!a.semester)throw new Error("Profile incomplete: missing program, academic year, year, or semester.");const{id:u,program_code:x,academic_year:T,year_of_study:A,semester:ee}=a,re=T.trim().split("/"),ie=re[0]?.toUpperCase()||"",le=re[1]?.toUpperCase()||"",Je=x.toUpperCase().trim(),we=`YEAR${A}_SEM${ee}`.toUpperCase();console.log("Student cohort:",{programCode:x,academicYear:T,cohort:we,uuid:u});const ae=await(async(M="")=>{let k=[];const q=async($="")=>{const{data:V,error:K}=await oe.storage.from("Tutorials").list($,{limit:1e3,offset:0,sortBy:{column:"name",order:"asc"}});if(K){console.error("Storage list error at path",$,K);return}if(!(!V||V.length===0))for(const G of V){const me=$?`${$}/${G.name}`:G.name;if(G.id===null||G.name.endsWith("/"))await q(me);else{const{data:Ze}=oe.storage.from("Tutorials").getPublicUrl(me);k.push({name:G.name,path:me,url:Ze.publicUrl,created_at:G.created_at})}}};return await q(M),k})();console.log(`Found ${ae.length} ACTUAL FILES in Tutorials bucket:`,ae.map(M=>M.path));const se=ae.filter(M=>{const k=M.path.toUpperCase(),q=k.includes(Je),$=k.includes(we),V=ie?k.includes(ie):!0,K=le?k.includes(le):!0;return q&&$&&V&&K});console.log(`Filtered to ${se.length} matching tutorials`),console.log(`Found ${ae.length} files in Tutorials bucket`),ae.forEach(M=>{console.log("Available file path:",M.path)}),console.log(`Filtered to ${se.length} matching tutorials`);const{data:Qe,error:Ee}=await oe.from("student_courses").select("courses(course_code)").eq("student_id",u);Ee&&console.warn("Could not load enrollments:",Ee);const wt=Qe?.map(M=>M.courses?.course_code?.toUpperCase())||[],_e=new Set;se.forEach(M=>{let k=M.path.split("/");k[0]==="tutorials"&&(k=k.slice(1)),k.length>=1&&_e.add(k[0])});const Ce=Array.from(_e);let Ne=new Map;if(Ce.length>0){const{data:M,error:k}=await oe.from("lecturers").select("id, full_name").in("id",Ce);k?console.warn("Could not load lecturer names:",k):M.forEach(q=>{Ne.set(q.id,q.full_name||"Lecturer")})}const pe=se.map(M=>{let k=M.path.split("/");k[0]==="tutorials"&&(k=k.slice(1));const q=k.length>=1?k[0]:null,$=Ne.get(q)||"Lecturer";let V="General";k.length>=4&&(V=k[2].toUpperCase());let K=M.name.replace(/\.[^.]+$/,"").replace(/^\d{10,14}_[a-z0-9]{6,10}_/i,"").replace(/_+/g," ").trim();return K=K.toLowerCase().replace(/\b\w/g,G=>G.toUpperCase())||"Untitled Tutorial",{id:`storage-${M.path.replace(/\//g,"-").replace(/\./g,"_")}`,title:K,description:"",videoSrc:M.url,hasVideo:M.name.match(/\.(mp4|webm|ogg|mov)$/i)!==null,lecturer:$,courseCode:V,courseName:V==="General"?"General Tutorial":V,fileUrls:[],viewCount:0,created_at:M.created_at}});pe.sort((M,k)=>{const q=new Date(k.created_at)-new Date(M.created_at);return q!==0?q:M.title.localeCompare(k.title)}),s(pe),pe.length===0&&v("No tutorials available for your program and cohort yet. Check back later!")}catch(a){console.error("Error loading tutorials:",a),v(`Failed to load tutorials: ${a.message}`)}finally{n(!1)}},Z=a=>new Promise(h=>{const u=document.createElement("video"),x=document.createElement("canvas");u.src=a,u.crossOrigin="anonymous",u.muted=!0,u.preload="metadata",u.onloadedmetadata=()=>{let T=1;u.duration&&!isNaN(u.duration)&&u.duration>4&&(T=Math.min(u.duration*.25,u.duration-1)),u.currentTime=T},u.onseeked=()=>{x.width=u.videoWidth,x.height=u.videoHeight,x.getContext("2d").drawImage(u,0,0,x.width,x.height),h(x.toDataURL("image/jpeg",.8))},u.onerror=()=>{h(null)}}),W=async a=>{if(!a.videoSrc){alert("Video source not available");return}Object.values(D.current).forEach(h=>{h&&(h.pause(),h.currentTime=0)}),e(a),E(!0),r(!0),d(!1)},B=()=>{F.current&&(F.current.pause(),F.current.currentTime=0),E(!1),e(null),r(!1),d(!1)},_=()=>{r(!1),d(!1)},g=()=>{r(!1),d(!0)},S=a=>{switch(a?.toLowerCase()){case"beginner":return"#28a745";case"advanced":return"#dc3545";default:return"#007bff"}},l=()=>{n(!0),J()},i=(a,h)=>{if(!a){alert("No download URL available");return}const u=h.replace(/[^a-z0-9]/gi,"_").substring(0,100).trim(),x=u?`${u}.mp4`:"tutorial_video.mp4",T=`${a}?download=${encodeURIComponent(x)}`,A=document.createElement("a");A.href=T,A.download=x,A.style.display="none",document.body.appendChild(A),A.click(),document.body.removeChild(A),P(x),O(!0),console.log("Direct download started:",x)},C=async(a,h)=>{try{const u=document.createElement("a");u.href=a,u.download=h||"tutorial-file",u.target="_blank",document.body.appendChild(u),u.click(),document.body.removeChild(u)}catch(u){console.error("Error downloading file:",u),alert("Failed to download file")}},t=(a,h,u)=>{if(!D.current[a]){const T=document.createElement("video");T.muted=!0,T.loop=!0,T.playsInline=!0,T.preload="metadata",D.current[a]=T}const x=D.current[a];u&&h?(x.src!==h&&(x.src=h),x.play().catch(T=>{console.log("Auto-play prevented:",T)})):(x.pause(),x.currentTime=0)};return b?o.createElement("div",{className:"tutorials-container"},o.createElement("div",{className:"tutorials-loading-state"},o.createElement("div",{className:"tutorials-spinner-container"},o.createElement("div",{className:"tutorials-spinner"},o.createElement("div",{className:"tutorials-spinner-circle"}),o.createElement("div",{className:"tutorials-spinner-circle"}),o.createElement("div",{className:"tutorials-spinner-circle"}),o.createElement("div",{className:"tutorials-spinner-circle"}))),o.createElement("p",{className:"tutorials-loading-text"},"Loading tutorials...")),o.createElement("style",{jsx:!0},`
        .tutorials-container {
          padding: 24px;
          min-height: calc(100vh - 80px);
          background: #f8f9fa;
        }
        
        .tutorials-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 70vh;
          gap: 24px;
        }
        
        .tutorials-spinner-container {
          width: 80px;
          height: 80px;
          position: relative;
        }
        
        .tutorials-spinner {
          width: 100%;
          height: 100%;
          position: relative;
          animation: tutorials-spinner-rotate 2s linear infinite;
        }
        
        .tutorials-spinner-circle {
          position: absolute;
          width: 20px;
          height: 20px;
          background: #007bff;
          border-radius: 50%;
          animation: tutorials-spinner-bounce 1.5s ease-in-out infinite;
        }
        
        .tutorials-spinner-circle:nth-child(1) {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0s;
        }
        
        .tutorials-spinner-circle:nth-child(2) {
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          animation-delay: 0.15s;
        }
        
        .tutorials-spinner-circle:nth-child(3) {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0.3s;
        }
        
        .tutorials-spinner-circle:nth-child(4) {
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          animation-delay: 0.45s;
        }
        
        .tutorials-loading-text {
          font-size: 18px;
          color: #666;
          font-weight: 500;
          margin: 0;
        }
        
        @keyframes tutorials-spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes tutorials-spinner-bounce {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.5;
          }
        }
      `)):c?o.createElement("div",{className:"tutorials-container"},o.createElement("div",{className:"tutorials-header"},o.createElement("div",{className:"header-left"},o.createElement("h1",{className:"page-title"},o.createElement("i",{className:"fas fa-video"})," Video Tutorials"))),o.createElement("div",{className:"error-state"},o.createElement("div",{className:"error-icon"},o.createElement("i",{className:"fas fa-exclamation-triangle"})),o.createElement("h3",{className:"error-title"},"Unable to Load Tutorials"),o.createElement("p",{className:"error-message"},c),o.createElement("button",{onClick:l,className:"primary-button"},o.createElement("i",{className:"fas fa-sync-alt"})," Try Again"))):o.createElement("div",{className:"tutorials-container"},o.createElement("div",{className:"tutorials-header"},o.createElement("div",{className:"header-left"},o.createElement("h1",{className:"page-title"},o.createElement("i",{className:"fas fa-video"})," Video Tutorials"),o.createElement("p",{className:"page-subtitle"},p.length," ",p.length===1?"tutorial":"tutorials"," available")),o.createElement("div",{className:"header-right"},o.createElement("button",{onClick:l,className:"secondary-button"},o.createElement("i",{className:"fas fa-sync-alt"})," Refresh"))),o.createElement("div",{className:"tutorials-grid"},p.length===0?o.createElement("div",{className:"empty-state"},o.createElement("div",{className:"empty-icon"},o.createElement("i",{className:"fas fa-video-slash"})),o.createElement("h3",{className:"empty-title"},"No Tutorials Found"),o.createElement("p",{className:"empty-message"},"No video tutorials available. Check back later or contact your instructor.")):p.map(a=>o.createElement("div",{key:a.id,className:"tutorial-card"},o.createElement("div",{className:"tutorial-thumbnail",onMouseEnter:()=>t(a.id,a.videoSrc,!0),onMouseLeave:()=>t(a.id,a.videoSrc,!1),onClick:()=>W(a)},o.createElement("div",{className:"thumbnail-content"},o.createElement("div",{className:"video-preview",ref:h=>{h&&D.current[a.id]&&h.appendChild(D.current[a.id])}}),o.createElement("div",{className:"thumbnail-fallback",style:{backgroundImage:j[a.id]?`url(${j[a.id]})`:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",backgroundSize:"cover",backgroundPosition:"center"}}),o.createElement("div",{className:"difficulty-badge",style:{display:"none",backgroundColor:S(a.difficulty)}},a.difficulty?.toUpperCase()),o.createElement("div",{className:"course-badge"},a.courseCode))),o.createElement("div",{className:"tutorial-content"},o.createElement("div",{className:"tutorial-header"},o.createElement("h3",{className:"tutorial-title",title:a.title},a.title),a.duration>0&&o.createElement("span",{className:"duration-badge"},o.createElement("i",{className:"far fa-clock"})," ",a.duration," min")),o.createElement("div",{className:"tutorial-details"},o.createElement("div",{className:"lecturer-info"},o.createElement("i",{className:"fas fa-chalkboard-teacher"}),o.createElement("span",null,a.lecturer)),o.createElement("div",{className:"course-info"},o.createElement("i",{className:"fas fa-book"}),o.createElement("span",null,a.courseName))),o.createElement("div",{className:"action-buttons"},o.createElement("button",{onClick:()=>W(a),className:"watch-button",disabled:!a.videoSrc},o.createElement("i",{className:"fas fa-play"})," Watch"),o.createElement("div",{className:"secondary-actions"},a.videoSrc&&o.createElement("button",{onClick:h=>{h.stopPropagation(),i(a.videoSrc,a.title)},className:"download-button",title:"Download video"},o.createElement("i",{className:"fas fa-download"})," Download"),a.fileUrls&&a.fileUrls.length>0&&o.createElement("button",{onClick:h=>{h.stopPropagation(),C(a.fileUrls[0],`${a.title}_materials.zip`)},className:"materials-button",title:"Download materials"},o.createElement("i",{className:"fas fa-file-download"})))))))),o.createElement(Xe,{isOpen:N,onRequestClose:B,className:"video-modal",overlayClassName:"video-modal-overlay",shouldCloseOnOverlayClick:!0,shouldCloseOnEsc:!0},w&&o.createElement("div",{className:"modal-container"},o.createElement("div",{className:"modal-header"},o.createElement("div",{className:"modal-title-section"},o.createElement("h2",{className:"modal-title"},w.title),o.createElement("div",{className:"modal-subtitle"},o.createElement("span",{className:"subtitle-item"},o.createElement("i",{className:"fas fa-chalkboard-teacher"})," ",w.lecturer),o.createElement("span",{className:"subtitle-divider"},"•"),o.createElement("span",{className:"subtitle-item"},o.createElement("i",{className:"fas fa-book"})," ",w.courseCode))),o.createElement("div",{className:"modal-actions"},o.createElement("button",{onClick:()=>i(w.videoSrc,w.title),className:"modal-download-btn",title:"Download video"},o.createElement("i",{className:"fas fa-download"})," Download"),o.createElement("button",{onClick:B,className:"modal-close-btn",title:"Close"},o.createElement("i",{className:"fas fa-times"})))),o.createElement("div",{className:"video-container"},m&&o.createElement("div",{className:"video-loading"},o.createElement("div",{className:"loading-spinner-small"}),o.createElement("p",null,"Loading video...")),f?o.createElement("div",{className:"video-error"},o.createElement("div",{className:"error-icon-large"},o.createElement("i",{className:"fas fa-exclamation-triangle"})),o.createElement("h3",null,"Video Playback Error"),o.createElement("p",null,"Unable to load the video. Please try downloading it instead."),o.createElement("button",{onClick:()=>i(w.videoSrc,w.title),className:"modal-download-btn"},o.createElement("i",{className:"fas fa-download"})," Download Video")):o.createElement("video",{ref:F,src:w.videoSrc,className:"video-player",controls:!0,controlsList:"nodownload",preload:"metadata",playsInline:!0,crossOrigin:"anonymous",onLoadedData:_,onError:g,autoPlay:!0},"Your browser does not support the video tag.")),o.createElement("div",{className:"video-description"},o.createElement("div",{className:"description-header"},o.createElement("h4",{className:"description-title"},o.createElement("i",{className:"fas fa-info-circle"})," Description from Lecturer"),o.createElement("div",{className:"description-badge"},"Tutorial Material")),o.createElement("div",{className:"description-content"},o.createElement("p",{className:"description-text"},w.description||"Tutorial material")),w.fileUrls&&w.fileUrls.length>0&&o.createElement("div",{className:"materials-section"},o.createElement("h5",{className:"materials-title"},o.createElement("i",{className:"fas fa-file-download"})," Download Materials"),o.createElement("div",{className:"materials-list"},w.fileUrls.map((a,h)=>o.createElement("button",{key:h,onClick:()=>C(a,`${w.title}_material_${h+1}.zip`),className:"material-btn"},o.createElement("i",{className:"fas fa-download"}),o.createElement("span",null,"Material ",h+1)))))))),y&&o.createElement("div",{className:"download-toast"},o.createElement("div",{className:"toast-content"},o.createElement("i",{className:"fas fa-check-circle"}),o.createElement("span",null,"Download started: ",R))),o.createElement("style",{jsx:!0},`
        /* Base Container */
        .tutorials-container {
          padding: 24px;
          min-height: calc(100vh - 80px);
          background: #f8f9fa;
          position: relative;
        }

        /* Header Styles */
        .tutorials-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          flex: 1;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-title i {
          color: #007bff;
        }

        .page-subtitle {
          font-size: 14px;
          color: #475569;
          margin: 0.5rem 0 0 0;
          padding: 0.5rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          display: inline-block;
          font-weight: 500;
          border: 1px solid #e2e8f0;
          position: relative;
          padding-left: 2.5rem;
          margin-left: 20px;
        }

        .page-subtitle:before {
          content: '📚';
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
        }

        /* Button Styles */
        .primary-button {
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .primary-button:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .secondary-button {
          padding: 10px 20px;
          background: white;
          color: #495057;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .secondary-button:hover {
          background: #f8f9fa;
          border-color: #ced4da;
        }

        /* Loading State for Video Modal */
        .loading-spinner-small {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        /* Error State */
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 24px;
          text-align: center;
        }

        .error-icon {
          font-size: 64px;
          color: #dc3545;
        }

        .error-icon-large {
          font-size: 48px;
          color: #dc3545;
          margin-bottom: 16px;
        }

        .error-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .error-message {
          font-size: 16px;
          color: #666;
          max-width: 500px;
          margin: 0;
        }

        /* Tutorials Grid */
        .tutorials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .tutorials-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Tutorial Card */
        .tutorial-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .tutorial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        /* Thumbnail with Video Preview */
        .tutorial-thumbnail {
          height: 200px;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }

        .thumbnail-content {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .thumbnail-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity 0.3s ease;
          z-index: 2;
        }

        .tutorial-thumbnail:hover .thumbnail-overlay {
          opacity: 0;
        }

        .play-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #007bff;
        }

        .video-preview {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          overflow: hidden;
        }

        .video-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .tutorial-thumbnail:hover .video-preview video {
          opacity: 1;
        }

        .thumbnail-fallback {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .difficulty-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          z-index: 3;
        }

        .course-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          z-index: 3;
          display: none;
        }

        /* Tutorial Content */
        .tutorial-content {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .tutorial-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .tutorial-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.4;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .duration-badge {
          font-size: 12px;
          color: #666;
          background: #f8f9fa;
          padding: 2px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .tutorial-details {
          margin-bottom: 16px;
          flex: 1;
        }

        .lecturer-info, .course-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .lecturer-info i, .course-info i {
          color: #007bff;
          width: 16px;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
        }

        .watch-button {
          padding: 10px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          width: 100%;
        }

        .watch-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .watch-button:disabled {
          background: #e9ecef;
          color: #adb5bd;
          cursor: not-allowed;
        }

        .secondary-actions {
          display: flex;
          gap: 8px;
        }

        .download-button {
          flex: 1;
          padding: 10px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .download-button:hover {
          background: #218838;
        }

        .materials-button {
          width: 44px;
          height: 44px;
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .materials-button:hover {
          background: #138496;
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          color: #dee2e6;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #6c757d;
          margin: 0 0 12px 0;
        }

        .empty-message {
          font-size: 16px;
          color: #adb5bd;
          max-width: 400px;
          margin: 0;
        }

        /* ===== IMPROVED MODAL STYLES ===== */
        .video-modal {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          width: 90%;
          max-width: 800px; /* Reduced from 1000px */
          max-height: 85vh; /* Reduced from 100vh */
          margin: 40px auto;
          overflow: visible;
        }

        .video-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow: auto;
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 85vh; /* Reduced from 100vh */
          height: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Modal Header - Made more compact */
        .modal-header {
          padding: 16px 24px; /* Reduced padding */
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
          min-height: auto;
        }

        .modal-title-section {
          flex: 1;
          margin-right: 20px;
          min-width: 0; /* Allows text truncation */
        }

        .modal-title {
          font-size: 18px; /* Reduced from 20px */
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0; /* Reduced margin */
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .modal-subtitle {
          font-size: 13px; /* Reduced from 14px */
          color: #666;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px; /* Reduced gap */
          flex-wrap: wrap;
        }

        .subtitle-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .subtitle-divider {
          color: #adb5bd;
          font-size: 12px;
        }

        .modal-subtitle i {
          color: #007bff;
          font-size: 12px; /* Reduced icon size */
        }

        .modal-actions {
          display: flex;
          gap: 8px; /* Reduced gap */
          align-items: center;
          flex-shrink: 0;
        }

        .modal-download-btn {
          padding: 6px 12px; /* Reduced padding */
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px; /* Reduced font size */
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .modal-download-btn:hover {
          background: #218838;
          transform: translateY(-1px);
        }

        .modal-close-btn {
          width: 32px; /* Reduced from 40px */
          height: 32px; /* Reduced from 40px */
          background: none;
          border: none;
          color: #6c757d;
          font-size: 16px; /* Reduced from 20px */
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: #e9ecef;
          color: #495057;
        }

        /* Video Container - Made smaller */
        .video-container {
          position: relative;
          background: #000;
          padding-top: 45%; /* Reduced from 56.25% (16:9 to 20:9) */
          flex-shrink: 0;
        }

        .video-player {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          z-index: 1;
        }

        /* Video Loading */
        .video-loading {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 2;
        }

        .video-loading p {
          color: white;
          font-size: 14px;
          margin: 0;
        }

        /* Video Error */
        .video-error {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          text-align: center;
          z-index: 2;
        }

        .video-error h3 {
          color: white;
          font-size: 18px;
          margin: 0;
        }

        .video-error p {
          color: #adb5bd;
          margin: 0;
          max-width: 400px;
          font-size: 14px;
        }

        /* Video Description - Improved visibility */
        .video-description {
          padding: 20px; /* Reduced from 24px */
          overflow-y: auto;
          flex: 1;
          max-height: calc(85vh - 200px); /* Ensures it fits */
          background: #ffffff;
          border-top: 1px solid #f1f3f4;
        }

        .description-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .description-title {
          font-size: 16px; /* Reduced from 18px */
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .description-title i {
          color: #007bff;
          font-size: 16px;
        }

        .description-badge {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }

        .description-content {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .description-text {
          font-size: 14px;
          color: #2d3748;
          line-height: 1.6;
          margin: 0;
          white-space: pre-line;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Materials Section */
        .materials-section {
          padding: 16px 0 0 0;
          border-top: 1px solid #e9ecef;
        }

        .materials-title {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .materials-title i {
          color: #17a2b8;
          font-size: 14px;
        }

        .materials-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .material-btn {
          padding: 8px 12px;
          background: #e9ecef;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 13px;
          color: #495057;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .material-btn:hover {
          background: #dee2e6;
          border-color: #ced4da;
          transform: translateY(-1px);
        }

        /* Download Toast */
        .download-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #28a745;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          animation: slideIn 0.3s ease;
          max-width: 400px;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .toast-content i {
          font-size: 18px;
          flex-shrink: 0;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ReactModal__Overlay {
          opacity: 0;
          transition: opacity 200ms ease-in-out;
        }

        .ReactModal__Overlay--after-open {
          opacity: 1;
        }

        .ReactModal__Overlay--before-close {
          opacity: 0;
        }

        /* Enhanced Video Controls */
        .video-player::-webkit-media-controls {
          display: flex !important;
        }

        .video-player::-webkit-media-controls-panel {
          background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
          backdrop-filter: blur(10px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .tutorials-container {
            padding: 16px;
          }

          .tutorials-header {
            flex-direction: column;
            gap: 16px;
          }

          .header-right {
            width: 100%;
            justify-content: flex-start;
          }

          .video-modal {
            width: 100%;
            margin: 0;
            max-height: 100vh;
            max-width: 100%;
          }

          .video-modal-overlay {
            padding: 0;
          }

          .modal-container {
            border-radius: 0;
            max-height: 100vh;
            height: 100vh;
          }

          .modal-header {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .modal-actions {
            width: 100%;
            justify-content: space-between;
          }

          .modal-title {
            font-size: 16px;
            -webkit-line-clamp: 1;
          }

          .video-container {
            padding-top: 56.25%; /* Back to 16:9 on mobile */
          }

          .action-buttons {
            flex-direction: row;
          }

          .watch-button {
            width: auto;
          }

          .download-button {
            padding: 10px;
          }

          .download-button span {
            display: none;
          }

          .tutorials-grid {
            gap: 16px;
          }

          .download-toast {
            bottom: 16px;
            right: 16px;
            left: 16px;
            max-width: none;
          }

          .description-content {
            padding: 12px;
          }
        }

        /* Improve accessibility */
        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Scrollbar styling for modal */
        .video-description::-webkit-scrollbar {
          width: 6px;
        }

        .video-description::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .video-description::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .video-description::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `))};export{_t as default};
