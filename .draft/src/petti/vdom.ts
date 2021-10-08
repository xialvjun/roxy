import {
  // isRenderFunction,
  VNode,
  isComponent,
  isElement,
  isEmpty,
  isLeaf,
  isNonEmptyArray,
  NonEmptyArrayVnode,
} from './h.js';
import {
  DOM_PROPS_DIRECTIVES,
  Env,
  Ref,
  RefArray,
  RefParent,
  RefSingle,
  RefType,
  SVG_NS,
  getDomNode,
  getNextSibling,
  getParentNode,
  insertDom,
  mountAttributes,
  mountDirectives,
  patchAttributes,
  patchDirectives,
  removeDom,
  replaceDom,
  unmountDirectives,
} from './dom.js';

export const DEFAULT_ENV: Env = {
  isSvg: false,
  directives: DOM_PROPS_DIRECTIVES,
};

// class Renderer {
//   constructor(props, env) {
//     this.props = props;
//     this._STATE_ = {
//       env,
//       vnode: null,
//       parentDomNode: null,
//       ref: mount(null),
//     };
//     this.render = this.render.bind(this);
//   }

//   setProps(props) {
//     this.oldProps = this.props;
//     this.props = props;
//     this[a]();
//   }

//   render(vnode) {
//     const state = this._STATE_;
//     const oldVNode = state.vnode;
//     state.vnode = vnode;
//     if (state.parentDomNode == null) {
//       let parentNode = getParentNode(state.ref);
//       if (parentNode == null) {
//         state.ref = mount(vnode, state.env);
//         return;
//       } else {
//         state.parentDomNode = parentNode;
//       }
//     }
//     // here we're sure state.parentDOMNode is defined
//     state.ref = patchInPlace(
//       state.parentDomNode,
//       vnode,
//       oldVNode,
//       state.ref,
//       state.env
//     );
//   }
// }

// key 无所谓一定要是 string | number，因为只要能用 === 做前后判断就好，如果 key 是对象，其实跟 Symbol 一样
// type RoxyProps = { key?: string|number };

// type OneOrMore<T> = T | [T, ...T[]];
// type ItemType<OneOrMore> = OneOrMore extends [] ? OneOrMore[0] : OneOrMore;
// type WatchCallback<WS extends OneOrMore<(props: any) => any>> = (cv: )
type InvalidateCbRegistrator = (cb: () => void) => void;
// type Inv = InvalidateCbRegistrator;
type WatchCallback<CV = any, PV = any> = (
  cv: CV,
  pv: PV,
  onInvalidate: InvalidateCbRegistrator
) => any;

type WatchSource<T = any> = () => T;
type WatchSourcesConstraint = WatchSource | [WatchSource, ...WatchSource[]];
type WSC = WatchSourcesConstraint;
// type ReadonlyWatchSourcesConstraint = Readonly<WSC>
// type RWSC = ReadonlyWatchSourcesConstraint;
type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true
      ? V | undefined
      : V
    : T[K] extends object
    ? Immediate extends true
      ? T[K] | undefined
      : T[K]
    : never;
};

interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
}

type ER<T extends Readonly<any>> = T extends Readonly<infer R> ? R : never;

// type WCB<WS extends WSC, Immediate extends Readonly<boolean> = false> = (
//   cv: WS extends WatchSource ? ReturnType<WS> : WS extends WatchSource[] ? MapSources<WS, false> : never,
//   pv: WS extends WatchSource ? ReturnType<WS> : WS extends WatchSource[] ? MapSources<WS, Immediate> : never,
//   inv: InvalidateCbRegistrator,
// ) => any;

type WatchStopHandle = () => void

interface Watch {
  <S extends WatchSource[], I extends boolean=false>(source: [...S], cb: WatchCallback<MapSources<S, false>, MapSources<S, I>>, options?: WatchOptions<I>): WatchSourcesConstraint;
  <T, I extends boolean=false>(source: WatchSource<T>, cb: WatchCallback<T, I extends true ? T | undefined : T>, options?: WatchOptions<I>): WatchStopHandle;
}

// let a: Watch = null!;
// a([() => 3, () => ''], (cv, pv, inv) => {

// }, { immediate: true })
// a([() => 3, () => ''], (cv, pv, inv) => {

// }, { immediate: false })
// a([() => 3, () => ''], (cv, pv, inv) => {

// })
// a(() => 3, (pv, cv, inv) => {}, { immediate: true });
// a(() => 3, (pv, cv, inv) => {}, { immediate: false });
// a(() => 3, (pv, cv, inv) => {});

const $hooks = Symbol('hooks');

const createInstance = (props, ctx) => {
  [
  'onBeforeMount',
  'onMounted',
  'onBeforeUpdate',
  'onUpdated',
  'onBeforeUnmount',
  'onUnmounted',
  ];
  'onErrorCaptured';
  // 所谓 watch 就是 effect 再进一步就是 lifeCycle
  'watch';'effect';'lifeCycle';
  // 所以就只有一个 on 方法，mount,mounted,update,updated,unmount,unmounted,error 七个事件
  // 至于想要 watch，effect 这些，可以有 helper 

  const hooks = {};
  const ins = { props, ctx, [$hooks]: hooks };
};

class Instance<P extends {}, C> {
  props: P;
  ctx: C;
  [$hooks] = {
    onBeforeMount: [] as (() => any)[],
    onMounted: [] as (() => any)[],
    onBeforeUpdate: [] as (() => any)[],
    onUpdated: [] as (() => any)[],
    onBeforeUnmount: [] as (() => any)[],
    onUnmounted: [] as (() => any)[],
    onErrorCaptured: [] as ((e: Error) => any)[],
    watch: [],
    // 不需要管 shouldUpdate，用户自己给返回的 render 方法包装一层，缓存之前的 vdom 对象，就能实现 shouldUpdate 功能
    // shouldUpdate: [],
  };
  constructor(props: P, ctx: C) {
    this.props = props;
    this.ctx = Object.create(ctx as any);
  }
  onBeforeMount(fn: () => any) {
    this[$hooks].onBeforeMount.push(fn);
    return () => {
      this[$hooks].onBeforeMount = this[$hooks].onBeforeMount.filter(
        (v) => v !== fn,
      );
    };
  }
  onMounted(fn: () => any) {
    this[$hooks].onMounted.push(fn);
    return () => {
      this[$hooks].onMounted = this[$hooks].onMounted.filter((v) => v !== fn);
    };
  }
  onBeforeUpdate(fn: () => any) {
    this[$hooks].onBeforeUpdate.push(fn);
    return () => {
      this[$hooks].onBeforeUpdate = this[$hooks].onBeforeUpdate.filter(
        (v) => v !== fn,
      );
    };
  }
  onUpdated(fn: () => any) {
    this[$hooks].onUpdated.push(fn);
    return () => {
      this[$hooks].onUpdated = this[$hooks].onUpdated.filter((v) => v !== fn);
    };
  }
  onBeforeUnmount(fn: () => any) {
    this[$hooks].onBeforeUnmount.push(fn);
    return () => {
      this[$hooks].onBeforeUnmount = this[$hooks].onBeforeUnmount.filter(
        (v) => v !== fn,
      );
    };
  }
  onUnmounted(fn: () => any) {
    this[$hooks].onUnmounted.push(fn);
    return () => {
      this[$hooks].onUnmounted = this[$hooks].onUnmounted.filter(
        (v) => v !== fn,
      );
    };
  }
  // watch: <WS extends WatchSource, Immediate extends Readonly<boolean> = false>(source: WS, cb: )
  // watch<WS extends WSC, Immediate extends Readonly<boolean> = false>(
  //   source: WS,
  //   cb: WCB<WS, Immediate>,
  //   options?: { immediate?: Immediate; deep?: boolean; flush?: 'pre' | 'post' },
  // ) {}
  // watch<WS extends WatchSource[], Immediate extends Readonly<boolean> = false>(source: WS, cb: WatchCallback<MapSources<WS, false>, MapSources<WS, Immediate>>, options?: WatchOptions<Immediate>): WatchStopHandle;
  // watch<WS extends Readonly<WatchSource[]>>(source: WS, cb: (cv: ReturnType<WS>, pv: ReturnType<WS>, inv: Inv) => any, options?: { immediate?: false }): WatchStopHandle;
  // watch<WS extends WatchSource>(source: WS, cb: (cv: ReturnType<WS>, pv: ReturnType<WS>, inv: Inv) => any, options?: { immediate?: false }): WatchStopHandle;
  // watch(source: any, cb: any, options?: any) {
  //   return () => {};
  // }
  watch<S extends WatchSource[], I extends boolean=false>(source: [...S], cb: WatchCallback<MapSources<S, false>, MapSources<S, I>>, options?: WatchOptions<I>): WatchSourcesConstraint;
  watch<T, I extends boolean=false>(source: WatchSource<T>, cb: WatchCallback<T, I extends true ? T | undefined : T>, options?: WatchOptions<I>): WatchStopHandle;
  watch(source: any, cb: any, options?: any) {
    return () => {};
  }
}

// const ins = new Instance({ a: 123 }, { b: '234' });
// ins.watch([() => ins.props.a, () => ins.ctx.b], (cv, pv) => {
  
// }, { immediate: true })
// ins.watch(() => ins.props.a, (cv, pv, inv) => {

// }, { immediate: true });

// const a: {map: number} = {map:234};

const ins_private = Symbol('ROXY_INSTANCE_PRIVATE');



export function mount(vnode: VNode, env = DEFAULT_ENV, ctx: any=null): Ref {
  if (isEmpty(vnode)) {
    return {
      type: RefType.SINGLE,
      node: document.createComment('NULL'),
    };
  } else if (isLeaf(vnode)) {
    return {
      type: RefType.SINGLE,
      node: document.createTextNode(vnode as string),
    };
  } else if (isElement(vnode)) {
    let node: Element;
    let { type, props } = vnode;
    if (type === 'svg' && !env.isSvg) {
      env = { ...env, isSvg: true };
    }
    if (!env.isSvg) {
      node = document.createElement(type);
    } else {
      node = document.createElementNS(SVG_NS, type);
    }
    mountAttributes(node, props, env);
    let childrenRef: Ref | null | undefined =
      props.children == null ? props.children : mount(props.children, env);
    /**
     * We need to insert content before setting interactive props
     * that rely on children been present (e.g select)
     */
    if (childrenRef != null) insertDom(node, childrenRef, null);
    mountDirectives(node, props, env);
    return {
      type: RefType.SINGLE,
      node,
      children: childrenRef!,
    };
  } else if (isNonEmptyArray(vnode)) {
    return {
      type: RefType.ARRAY,
      children: vnode.map((child) => mount(child, env)) as [Ref, ...Ref[]],
    };
  } else if (isComponent(vnode)) {
    // const hooks = {};
    // beforeCreate -> use setup()
    // created -> use setup()
    // beforeMount -> onBeforeMount
    // mounted -> onMounted
    // beforeUpdate -> onBeforeUpdate
    // updated -> onUpdated
    // beforeUnmount -> onBeforeUnmount
    // unmounted -> onUnmounted
    // errorCaptured -> onErrorCaptured
    // renderTracked -> onRenderTracked
    // renderTriggered -> onRenderTriggered
    // activated -> onActivated
    // deactivated -> onDeactivated

    // const onMounted = (fn) => hooks.onMounted.push(fn);

    let { type, props } = vnode;
    const ins = new Instance(props, ctx);
    
    // const ins = { props, ctx: Object.create(context), onMounted };
    const { render, expose } = type(props, ins);
    // let renderer = new Renderer(vnode.props, env);
    // vnode.type.mount(renderer);
    const result = render(props);
    const childRef = mount(result, env, ins.ctx);
    return {
      type: RefType.PARENT,
      childRef,
      childState: { ins, render, expose, vnode: result }
      // childState: renderer,
    };
  }
  // if (vnode === undefined) {
  //   throw new Error("mount: vnode is undefined!");
  // }
  throw new Error('mount: Invalid Vnode!');
}


// createNode(null / string / number / { type: string, props: any(key,ref) }, ctx); // 组件的 ctx 默认创建新的，原生的 ctx 默认用旧的
// mountAttributes()
// insertDom(node, childrenRef, null);
// mountDirectives(node, props, env);
// (ref as RefSingle).node.nodeValue

export function patch(
  parentDomNode: Node,
  newVNode: VNode,
  oldVNode: VNode,
  ref: Ref,
  env = DEFAULT_ENV,
): Ref {
  if (oldVNode === newVNode) {
    return ref;
  } else if (isEmpty(newVNode) && isEmpty(oldVNode)) {
    return ref;
  } else if (isLeaf(newVNode) && isLeaf(oldVNode)) {
    (ref as RefSingle).node.nodeValue = newVNode as string;
    return ref;
  } else if (
    isElement(newVNode) &&
    isElement(oldVNode) &&
    newVNode.type === oldVNode.type
  ) {
    const ref_single = ref as RefSingle;
    if (newVNode.type === 'svg' && !env.isSvg) {
      env = Object.assign({}, env, { isSvg: true });
    }
    patchAttributes(ref_single.node as Element, newVNode.props, oldVNode.props, env);
    let oldChildren = oldVNode.props.children;
    let newChildren = newVNode.props.children;
    if (oldChildren == null) {
      if (newChildren != null) {
        ref_single.children = mount(newChildren, env);
        insertDom(ref_single.node, ref_single.children, null);
      }
    } else {
      if (newChildren == null) {
        ref_single.node.textContent = '';
        unmount(oldChildren, ref_single.children!, env);
        ref_single.children = undefined;
      } else {
        ref_single.children = patchInPlace(
          ref_single.node,
          newChildren,
          oldChildren,
          ref_single.children!,
          env,
        );
      }
    }
    patchDirectives(ref_single.node as Element, newVNode.props, oldVNode.props, env);
    return ref_single;
  } else if (isNonEmptyArray(newVNode) && isNonEmptyArray(oldVNode)) {
    patchChildren(parentDomNode, newVNode, oldVNode, ref as RefArray, env);
    return ref;
  } else if (
    isComponent(newVNode) &&
    isComponent(oldVNode) &&
    newVNode.type === oldVNode.type
  ) {
    let ref_parent = ref as RefParent;
    const { ins, render, expose, vnode: old_inner_vnode } = ref_parent.childState;
    ins.props = newVNode.props;
    const new_inner_vnode = render(ins.props);
    let childRef = patch(parentDomNode, new_inner_vnode, old_inner_vnode, ref_parent.childRef, env);
    ref_parent.childState.vnode = new_inner_vnode;
    ref_parent.childRef = childRef;
    return ref_parent;

    // let renderFn = newVNode.type;
    // let shouldUpdate =
    //   renderFn.shouldUpdate != null
    //     ? renderFn.shouldUpdate(oldVNode.props, newVNode.props)
    //     : defaultShouldUpdate(oldVNode.props, newVNode.props);
    // if (shouldUpdate) {
    //   let childVNode = renderFn(newVNode.props);
    //   let childRef = patch(
    //     parentDomNode,
    //     childVNode,
    //     ref.childState,
    //     ref.childRef,
    //     env,
    //   );
    //   // We need to return a new ref in order for parent patches to
    //   // properly replace changing DOM nodes
    //   if (childRef !== ref.childRef) {
    //     return {
    //       type: RefType.PARENT,
    //       childRef,
    //       childState: childVNode,
    //     };
    //   } else {
    //     ref.childState = childVNode;
    //     return ref;
    //   }
    // } else {
    //   return ref;
    // }
  // } else if (
  //   isComponent(newVNode) &&
  //   isComponent(oldVNode) &&
  //   newVNode.type === oldVNode.type
  // ) {
  //   const renderer = ref.childState;
  //   const state = renderer._STATE_;
  //   state.env = env;
  //   state.parentNode = parentDomNode;
  //   renderer.setProps(newVNode.props);
  //   newVNode.type.patch(renderer);
  //   if (ref.childRef !== state.ref) {
  //     return {
  //       type: RefType.PARENT,
  //       childRef: state.ref,
  //       childState: renderer,
  //     };
  //   } else {
  //     return ref;
  //   }
  // } else if (newVNode instanceof Node && oldVNode instanceof Node) {
  //   ref.node = newVNode;
  //   return ref;
  } else {
    return mount(newVNode, env);
  }
}

/**
 * Execute any compoenent specific unmount code
 */
export function unmount(vnode, ref, env) {
  // if (vnode instanceof Node ||  isEmpty(vnode) || isLeaf(vnode)) return;
  if (isElement(vnode)) {
    unmountDirectives(ref.node, vnode.props, env);
    if (vnode.props.children != null)
      unmount(vnode.props.children, ref.children, env);
  } else if (isNonEmptyArray(vnode)) {
    vnode.forEach((childVNode, index) =>
      unmount(childVNode, ref.children[index], env),
    );
  } else if (isRenderFunction(vnode)) {
    unmount(ref.childState, ref.childRef, env);
  } else if (isComponent(vnode)) {
    vnode.type.unmount(ref.childState);
  }
}

export function patchInPlace(parentDomNode: Node, newVNode: VNode, oldVNode: VNode, ref: Ref, env: Env) {
  const newRef = patch(parentDomNode, newVNode, oldVNode, ref, env);
  if (newRef !== ref) {
    replaceDom(parentDomNode, newRef, ref);
    unmount(oldVNode, ref, env);
  }
  return newRef;
}

function patchChildren(parentDomNode: Node, newChildren: NonEmptyArrayVnode, oldchildren: NonEmptyArrayVnode, ref: RefArray, env: Env) {
  // We need to retreive the next sibling before the old children
  // get eventually removed from the current DOM document
  const nextNode = getNextSibling(ref);
  const children = Array(newChildren.length);
  let refChildren = ref.children as any[];
  let newStart = 0,
    oldStart = 0,
    newEnd = newChildren.length - 1,
    oldEnd = oldchildren.length - 1;
  let oldVNode, newVNode, oldRef, newRef, refMap;

  while (newStart <= newEnd && oldStart <= oldEnd) {
    if (refChildren[oldStart] === null) {
      oldStart++;
      continue;
    }
    if (refChildren[oldEnd] === null) {
      oldEnd--;
      continue;
    }

    oldVNode = oldchildren[oldStart];
    newVNode = newChildren[newStart];
    if (newVNode?.key === oldVNode?.key) {
      oldRef = refChildren[oldStart];
      newRef = children[newStart] = patchInPlace(
        parentDomNode,
        newVNode,
        oldVNode,
        oldRef,
        env,
      );
      newStart++;
      oldStart++;
      continue;
    }

    oldVNode = oldchildren[oldEnd];
    newVNode = newChildren[newEnd];
    if (newVNode?.key === oldVNode?.key) {
      oldRef = refChildren[oldEnd];
      newRef = children[newEnd] = patchInPlace(
        parentDomNode,
        newVNode,
        oldVNode,
        oldRef,
        env,
      );
      newEnd--;
      oldEnd--;
      continue;
    }

    if (refMap == null) {
      refMap = {} as any;
      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldchildren[i] as any;
        if (oldVNode?.key != null) {
          refMap[oldVNode.key] = i;
        }
      }
    }

    newVNode = newChildren[newStart] as any;
    const idx = newVNode?.key != null ? refMap[newVNode.key] : null;
    if (idx != null) {
      oldVNode = oldchildren[idx];
      oldRef = refChildren[idx];
      newRef = children[newStart] = patch(
        parentDomNode,
        newVNode,
        oldVNode,
        oldRef,
        env,
      );
      insertDom(parentDomNode, newRef, getDomNode(refChildren[oldStart]));
      if (newRef !== oldRef) {
        removeDom(parentDomNode, oldRef);
        unmount(oldVNode, oldRef, env);
      }
      refChildren[idx] = null;
    } else {
      newRef = children[newStart] = mount(newVNode, env);
      insertDom(parentDomNode, newRef, getDomNode(refChildren[oldStart]));
    }
    newStart++;
  }

  const beforeNode =
    newEnd < newChildren.length - 1
      ? getDomNode(children[newEnd + 1])
      : nextNode;
  while (newStart <= newEnd) {
    const newRef = mount(newChildren[newStart], env);
    children[newStart] = newRef;
    insertDom(parentDomNode, newRef, beforeNode);
    newStart++;
  }
  while (oldStart <= oldEnd) {
    oldRef = refChildren[oldStart];
    if (oldRef != null) {
      removeDom(parentDomNode, oldRef);
      unmount(oldchildren[oldStart], oldRef, env);
    }
    oldStart++;
  }
  ref.children = children as any;
}

// function defaultShouldUpdate(p1, p2) {
//   if (p1 === p2) return false;
//   for (let key in p2) {
//     if (p1[key] !== p2[key]) return true;
//   }
//   return false;
// }
