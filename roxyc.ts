// import * as env_dom from './dom';

import * as hs from './h';

// type A = number | null;
// type B = null extends A ? 1 : 2;
// type Super<S, T> = T extends S ? any : never;
// type C = Super<null, null | number>;
// type D = number extends unknown ? 1 : 2;

// ! enviroment
// 理论上来说，真要把 Env 用起来，那么 Node 在纯粹的数据层面，必须是个 引用类型，而不是基础类型，并且可选的有有序的 children
// 如果要方便用户使用的话，应该有 C super null 作为 generic constraint, 但 ts 没有这种写法，只能 C=any, CN=C|null
// 不过这里只是底层写法，之后可以把函数包装起来，而且 env_dom 本身支持 null
// ! Env 的 Ctx 不得被更改，而传对象都难免 Env 的实现修改了 ctx，所以干脆限制它为 string 好了，就当是进程间消息传递
// Env 的 ctx 必须是 字符串，因为 roxy 不会对其产生新对象，子元素与父元素使用的同一对象，所以如果不是字符串，理论上会出现不正确的 Env 实现，修改了父元素的 ctx
export type Env<N = any> = {
  createNode(vnode: any, ctx: string): { node: N; ctx: string };
  mountAttributesBeforeChildren(node: N, vnode: any, ctx: string): void;
  mountAttributesAfterChildren(node: N, vnode: any, ctx: string): void;
  patchAttributesBeforeChildren(node: N, newVnode: any, oldVnode: any, ctx: string): void;
  patchAttributesAfterChildren(node: N, newVnode: any, oldVnode: any, ctx: string): void;
  unmountAttributesBeforeChildren(node: N, vnode: any, ctx: string): void;
  unmountAttributesAfterChildren(node: N, vnode: any, ctx: string): void;
  insertBefore(parentNode: N, newNode: N, referenceNode?: N | null): void;
  removeChild(parentNode: N, child: N): void;
  parentNode(node: N): N | null;
  nextSibling(node: N): N | null;
};

// const TASKS: any[] = [];
// let IS_WORKING = false;
// const START = (work: any) => {
//   TASKS.push(work);
//   if (IS_WORKING) return;
//   IS_WORKING = true;
//   work = null;
//   while (work = TASKS.pop()) {
//     work();
//   }
//   IS_WORKING = false;
// };
const START = ((tasks: any[], is_working: boolean) => (work: any) => {
  tasks.push(work);
  if (is_working) return;
  is_working = true;
  work = null;
  while (work = tasks.pop()) {
    work();
  }
  is_working = false;
})([], false);

// ! instance
type EventMap = {
  mount: never;
  mounted: never;
  render: never;
  rendered: never;
  update: never;
  updated: never;
  patch: never;
  patched: never;
  unmount: never;
  unmounted: never;
  error: Error;
};
// const ons_symbol = Symbol('ons');
function instance<P = any, C extends object = object>(props: P, ctx: C | null = null, update: (fn?: ()=>any)=>any) {
  const ons: Record<keyof EventMap, Function[]> = {} as any;
  const on = <K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => any,
  ) => {
    ons[type] = [...ons[type], listener];
    return () => {
      ons[type].splice(ons[type].indexOf(listener), 1);
    }
    // return () => {
    //   ons[type] = ons[type].filter((l) => l !== listener);
    // };
  };
  // const updates: (() => any)[] = [];
  // const update = (fn?: ()=>any) => {
  //   // fn && updates.push(fn);
  //   // schedule();
  //   START(['update', fn])
  // }
  return { props, ctx: Object.create(ctx) as C & Record<PropertyKey, any>, [instance.ons]: ons, on, update };
}
instance.ons = Symbol('instance.ons');
// const ons_symbol = Symbol('ons');
// class Instance<P = any, C extends {} = {}> {
//   [ons_symbol] = {} as Record<keyof EventMap, Function[]>;

// }

// function proto<P extends {}={}>(p: P|null): P & Record<PropertyKey, any> {
//   return Object.create(p);
// }
// const b = proto({a: 3});
// b.c = 123;
// b[Symbol()] = {};

// ! mount reference
const enum RefType {
  ITEM,
  LIST,
  ROXY,
}
type ItemRef<N, S> = {
  type: RefType.ITEM;
  node: N;
  listRef?: Ref<N, S> | null;
  state: S; // ItemRef 的 state 不一定只有 env_ctx, 有可能也有别的，
  // 例如有的平台没有 removeEventListener，只有 addEventListener 时返回的 revoker，则需要把 revoker 放进 state 中
  // state 跟 ctx 不是一回事，不能把 state 放进 ctx 中
};
type ListRef<N, S> = {
  type: RefType.LIST;
  refList: [Ref<N, S>, ...Ref<N, S>[]];
  state: S;
};
type RoxyRef<N, S> = {
  type: RefType.ROXY;
  resRef: Ref<N, S>;
  state: S;
};
type Ref<N = any, S = any> = ItemRef<N, S> | ListRef<N, S> | RoxyRef<N, S>;

// ! decorate env
function getHeadNode<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return getHeadNode(ref.refList[0]);
  }
  if (ref.type === RefType.ROXY) {
    return getHeadNode(ref.resRef);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getParentNode<N>(ref: Ref<N>, env: Env<N>): N | null {
  if (ref.type === RefType.ITEM) {
    return env.parentNode(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getParentNode(ref.refList[0], env);
  }
  if (ref.type === RefType.ROXY) {
    return getParentNode(ref.resRef, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getNextSibling<N>(ref: Ref<N>, env: Env): N | null {
  if (ref.type === RefType.ITEM) {
    return env.nextSibling(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getNextSibling(ref.refList[ref.refList.length - 1], env);
  }
  if (ref.type === RefType.ROXY) {
    return getNextSibling(ref.resRef, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function insertNodes<N>(
  parentNode: N,
  ref: Ref<N>,
  nextSibling: N | null,
  env: Env,
): void {
  if (ref.type === RefType.ITEM) {
    return env.insertBefore(parentNode, ref.node, nextSibling);
  }
  if (ref.type === RefType.LIST) {
    return ref.refList.forEach((ch) => {
      insertNodes(parentNode, ch, nextSibling, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    return insertNodes(parentNode, ref.resRef, nextSibling, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function removeNodes<N>(parentNode: N, ref: Ref, env: Env) {
  if (ref.type === RefType.ITEM) {
    return env.removeChild(parentNode, ref.node);
  }
  if (ref.type === RefType.LIST) {
    return ref.refList.forEach((ch) => {
      removeNodes(parentNode, ch, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    removeNodes(parentNode, ref.resRef, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function replaceNodes<N>(parentNode: N, newRef: Ref, oldRef: Ref, env: Env) {
  insertNodes(parentNode, newRef, getHeadNode(oldRef), env);
  removeNodes(parent, oldRef, env);
}

/**
 * 生命周期执行逻辑。因为要有 onMounted 生命周期，所以 mount 函数不能无中生有创造 node 节点，而应该是父节点直接传给 mount，它才有生命周期。
 * 如果无中生有创建节点，但一开始不执行 onMounted 似乎可以，但实际不行，因为用户把创建的 node attatch 时又不会通知框架去执行生命周期。
 * 其他应用也是 createApp().mount(node), 真实操作仍在 mount 那一步。
 */

// mount(vnode, env=env_dom, env_ctx=null, roxy_ctx=null)
// type RefRoxyState = string | { ins: ReturnType<typeof instance>, render: () => hs.Vnode, result: hs.Vnode, env_ctx: string, ctx: any };
export function mount<N>(
  vnode: hs.Vnode,
  parentNode: N,
  env: Env<N>,
  ctx: any = null,
  env_ctx = '',
): Ref<N, any> {

  // ctx.env | ctx.roxy
  // const creation = env.createNode(vnode, env_ctx);
  // const node = creation.node;
  // env_ctx = creation.ctx;
  // env_ctx = env.mountAttributesBeforeChildren(node, vnode, env_ctx);
  // const children_ref = mount(vnode.props.children, node, env, ctx, env_ctx);

  // env.mountAttributesAfterChildren(node, vnode, env_ctx)
  if (hs.isEmpty(vnode) || hs.isLeaf(vnode)) {
    const creation = env.createNode(vnode, env_ctx);
    const node = creation.node;
    env_ctx = creation.ctx;
    env.insertBefore(parentNode, node, null);
    return { type: RefType.ITEM, node, state: { env_ctx } };
  }
  if (hs.isElement(vnode)) {
    const creation = env.createNode(vnode, env_ctx);
    const node = creation.node;
    // ref 在 node 创建后立即执行，而不用考虑什么 mounted，避免复杂
    (vnode.props as any).ref?.(node);
    env_ctx = creation.ctx;
    env.insertBefore(parentNode, node, null);
    env.mountAttributesBeforeChildren(node, vnode, env_ctx);
    const children_vnode = vnode.props.children;
    const listRef = children_vnode == null ? children_vnode : mount(children_vnode, node, env, ctx, env_ctx);
    env.mountAttributesAfterChildren(node, vnode, env_ctx);
    return { type: RefType.ITEM, node, listRef, state: { env_ctx, ctx } };
  }
  if (hs.isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      refList: vnode.map((child) => mount(child, parentNode, env, ctx, env_ctx)) as [any, ...any[]],
      state: { env_ctx, ctx },
    };
  }
  if (hs.isComponent(vnode)) {
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

    const { type, props } = vnode;
    const update = (fn?: ()=>any) => {
      START(fn);
      START(() => {
        ins[instance.ons].render?.forEach(l => l());
        const result = render(ins.props);
        ins[instance.ons].rendered?.forEach(l => l());
        patch(parentNode, result, roxy_ref.state.result, roxy_ref, env);
      });
    };
    const ins = instance(props, ctx, update);
    // const _binding = type(props, ins);
    // const binding = typeof _binding === 'function' ? { render: _binding } : _binding;
    // const { render, expose, provide } = binding;
    const render = type(props, ins);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    // 算了，还是放在 render 前吧，跟 update 保持一致。以后如果发现有必要，再加生命周期
    ins[instance.ons].mount?.forEach(l => l());
    const result = render(props);
    const resRef = mount(result, parentNode, env, ins.ctx, env_ctx);
    ins[instance.ons].mounted?.forEach(l => l());
    const roxy_ref = {
      type: RefType.ROXY,
      resRef,
      state: { ins, render, result, env_ctx },
    }
    return roxy_ref;

    // const ins = new Instance(props, ctx);

    // // const ins = { props, ctx: Object.create(context), onMounted };
    // const { render, expose } = type(props, ins);
    // // let renderer = new Renderer(vnode.props, env);
    // // vnode.type.mount(renderer);
    // const result = render(props);
    // const childRef = mount(result, env, ins.ctx);
    // return {
    //   type: RefType.PARENT,
    //   childRef,
    //   childState: { ins, render, expose, vnode: result },
    //   // childState: renderer,
    // };
  }
  // if (vnode === undefined) {
  //   throw new Error("mount: vnode is undefined!");
  // }
  throw new Error('mount: Invalid Vnode!');
}

export function patch<N>(
  parentDomNode: Node,
  newVNode: hs.Vnode,
  oldVNode: hs.Vnode,
  ref: Ref<N, any>,
  env: Env<N>,
): Ref<N, any> {
  if (oldVNode === newVNode) {
    return ref;
  }
  if (hs.isEmpty(newVNode) && hs.isEmpty(oldVNode)) {
    return ref;
  }
  if (hs.isLeaf(newVNode) && hs.isLeaf(oldVNode)) {
    const ri = ref as ItemRef<N, any>;
    // 这说明 哪怕 ItemRef 也应该有保留 env_ctx 
    env.patchAttributesBeforeChildren(ri.node, newVNode, oldVNode, ri.state.env_ctx);
    env.patchAttributesAfterChildren(ri.node, newVNode, oldVNode, ri.state.env_ctx);
    return ri;
  }
  if (
    hs.isElement(newVNode) &&
    hs.isElement(oldVNode) &&
    newVNode.type === oldVNode.type
  ) {
    const ri = ref as ItemRef<N, any>;
    env.patchAttributesBeforeChildren(ri.node, newVNode, oldVNode, ri.state.env_ctx);
    let oldChildren = oldVNode.props.children;
    let newChildren = newVNode.props.children;
    if (oldChildren == null) {
      if (newChildren != null) {
        ri.listRef = mount(newChildren, env.parentNode(ri.node)!, env, ri.state.ctx, ri.state.env_ctx);
        // insertDom(ref_single.node, ref_single.children, null);
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

    // const ref_single = ref as RefSingle;
    // if (newVNode.type === 'svg' && !env.isSvg) {
    //   env = Object.assign({}, env, { isSvg: true });
    // }
    // patchAttributes(ref_single.node as Element, newVNode.props, oldVNode.props, env);
    // let oldChildren = oldVNode.props.children;
    // let newChildren = newVNode.props.children;
    // if (oldChildren == null) {
    //   if (newChildren != null) {
    //     ref_single.children = mount(newChildren, env);
    //     insertDom(ref_single.node, ref_single.children, null);
    //   }
    // } else {
    //   if (newChildren == null) {
    //     ref_single.node.textContent = '';
    //     unmount(oldChildren, ref_single.children!, env);
    //     ref_single.children = undefined;
    //   } else {
    //     ref_single.children = patchInPlace(
    //       ref_single.node,
    //       newChildren,
    //       oldChildren,
    //       ref_single.children!,
    //       env,
    //     );
    //   }
    // }
    // patchDirectives(ref_single.node as Element, newVNode.props, oldVNode.props, env);
    // return ref_single;
  }
  if (isNonEmptyArray(newVNode) && isNonEmptyArray(oldVNode)) {
    patchChildren(parentDomNode, newVNode, oldVNode, ref as RefArray, env);
    return ref;
  }
  if (
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

  } else {
    return mount(newVNode, env);
  }
}

export function unmount()
