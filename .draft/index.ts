// export type RoxyNode =

export const Fragment = Symbol('ROXY_FRAGMENT');
export const ErrorBoundry = Symbol('Ro_')
const migurdia = Symbol('-roxy-');

/*
  jsxFactory function
*/
// export function createElement(
//   type,
//   props,
//   ...children
// ) {
//   props = props ?? {};
//   props.children =
//     arguments.length > 3
//       ? Array.from(arguments).slice(2)
//       : arguments.length === 3
//       ? [arguments[2]]
//       : undefined;
//   const key = props.key ?? undefined;
//   return { type, props, key, __is_forgo_element__: true };
// }

// export const h = createElement;

function internalRender(new_vdoms, parent_element, old_vdoms, old_position) {}
// rokishi-miguludia

// 考虑到 富状态 元素 移动位置，例如 <div><canvas /><canvas key="main" /></div> 更新成 <div><canvas key="main" /><canvas /></div>
// 如果 old_vdom 内不包含 真实 dom 的引用，则完全不可能正确移动真实 dom 的位置，所以 old_vdom 内必然包含真实 dom 的引用
// 所以，上面的  internalRender(new_vdoms, parent_element, old_vdoms?)  尝试只依赖 新旧 vdom 以及真实 dom 的结构 来判断是行不通的

// render(<><A /><B /></>, '#app');
// render([<A />, <B />], '#app');
// render([<A />, <B />], '#app');

// 也许名字改叫 ctx->instance, inject->context 更合语义

type Watcher<P> = (props: P) => any;
export type RoxyComponentCtx<P, I> = {
  props: P;
  inject: I;
  provide: (name: PropertyKey, getter: () => any) => void;
  update: (updater?: () => any | (() => any)) => void; // update 更准确应该叫 schedule，`c=0;ctx.update(() => c++);assert(c==0)`
  lifecycle: (callback: () => any) => void;
  watch: (
    watcher: Watcher<P> | Watcher<P>[],
    callback: (cv: any, pv: any, inv: any) => any,
    options: { immediate: boolean; deep: boolean },
  ) => void;
  shouldUpdate: () => boolean, // 在 setup 阶段多次运行 shouldUpdate，则 只有所有返回 false 时才不 update，内部 update 无视 shouldUpdate
};
export type RoxyComponent<P, I> = (
  init_props: P,
  ctx: RoxyComponentCtx<P, I>,
) => { expose: any; render: (props: P) => any } | ((props: P) => any);

export function defineComponent<P, I>(
  factory: RoxyComponent<P, I>,
) {
  return factory;
}

const App = defineComponent((init_props: {name: string, age: number}, ctx) => {
  init_props.name;
  ctx.props.name;
  return (p) => {
    return ctx.props.name;
  }
});

var SSR_NODE = 1;
var TEXT_NODE = 3;
var EMPTY_OBJ = {};
var EMPTY_ARR = [];
var SVG_NS = 'http://www.w3.org/2000/svg';

var id = (a) => a;
var map = EMPTY_ARR.map;
var isArray = Array.isArray;
var enqueue =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : setTimeout;

var createClass = (obj) => {
  var out = '';
  if (typeof obj === 'string') return obj;
  if (isArray(obj)) {
    for (var k = 0, tmp; k < obj.length; k++) {
      if ((tmp = createClass(obj[k]))) {
        out += (out && ' ') + tmp;
      }
    }
  } else {
    for (var k in obj) {
      if (obj[k]) out += (out && ' ') + k;
    }
  }
  return out;
};

var listener = function(e) {
  this.events[e.type]?.(e);
}
var patchProperty = (node, key, oldValue, newValue, listener, isSvg) => {
  if (key === 'key') {
  } else if (key === 'style') {
    for (var k in { ...oldValue, ...newValue }) {
      oldValue = newValue == null || newValue[k] == null ? '' : newValue[k];
      if (k[0] === '-') {
        node[key].setProperty(k, oldValue);
      } else {
        node[key][k] = oldValue;
      }
    }
  } else if (key[0] === 'o' && key[1] === 'n') {
    if (
      !((node.events || (node.events = {}))[(key = key.slice(2))] = newValue)
    ) {
      node.removeEventListener(key, listener);
    } else if (!oldValue) {
      node.addEventListener(key, listener);
    }
  } else if (!isSvg && key !== 'list' && key !== 'form' && key in node) {
    node[key] = newValue == null ? '' : newValue;
  } else if (
    newValue == null ||
    newValue === false ||
    (key === 'class' && !(newValue = createClass(newValue)))
  ) {
    node.removeAttribute(key);
  } else {
    node.setAttribute(key, newValue);
  }
};


const h = (tag: any, props: any, ...children: VNode[]) => ({tag, props, children})

export type RoxyDOMElementProps = {
  xmlns?: string;
  ref?: RoxyRef<Element>;
  dangerouslySetInnerHTML?: { __html: string };
  children?: RoxyNode | RoxyNode[];
};

export type RoxyComponentProps = {};

export type RoxyElement<TProps> =
  | RoxyDOMElement<TProps>
  | RoxyComponentElement<TProps>;

export type RoxyNonEmptyPrimitiveNode =
  | string
  | number
  | true
  | bigint;

export type RoxyPrimitiveNode = RoxyNonEmptyPrimitiveNode | false | null | undefined;

export type RoxyNode = RoxyPrimitiveNode | RoxyElement<any> | RoxyFragment;

type VPrimitive = string | number | boolean | null | undefined
type VElement = ReturnType<typeof h>
type VNode = VPrimitive | VElement | VNode[]

const mount = (vdom: any, parent_dom: HTMLElement, hydrate?: boolean) => {
  // patch()
  if (typeof vdom.tag === 'string') {
    parent_dom.childNodes.forEach(it => it.remove());
    parent_dom.appendChild(document.createElement(vdom.tag))
    return;
  }
}
const patch = (new_vdom: any, parent_dom: any, old_vdom: any, old_dom: any) => {
  if (typeof new_vdom.tag === 'string') {
    return 
  }
}

// type VNode = 
