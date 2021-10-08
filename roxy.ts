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
export type Env<N = any> = {
  createNode(vnode: any, ctx: string): { node: N; ctx: string };
  mountAttributesBeforeChildren(node: N, vnode: any, ctx: string): N;
  mountAttributesAfterChildren(node: N, vnode: any, ctx: string): N;
  patchAttributesBeforeChildren(node: N, newVnode: any, oldVnode: any, ctx: string): N;
  patchAttributesAfterChildren(node: N, newVnode: any, oldVnode: any, ctx: string): N;
  unmountAttributesBeforeChildren(node: N, vnode: any, ctx: string): N;
  unmountAttributesAfterChildren(node: N, vnode: any, ctx: string): N;
  insertBefore(parentNode: N, newNode: N, referenceNode?: N|null): void;
  removeChild(parentNode: N, child: N): void;
  parentNode(node: N): N | null;
  nextSibling(node: N): N | null;
};

// ! instance
type EventMap = {
  mount: never;
  mounted: never;
  update: never;
  updated: never;
  unmount: never;
  unmounted: never;
  error: Error;
};
// const ons_symbol = Symbol('ons');
function instance<P = any, C extends {}={}>(props: P, ctx: C|null=null) {
  const ons: Record<keyof EventMap, Function[]> = {} as any;
  const on = <K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => any,
  ) => {
    ons[type] = [...ons[type], listener];
    return () => {
      ons[type] = ons[type].filter((l) => l !== listener);
    };
  };
  return { props, ctx: Object.create(ctx) as C & Record<PropertyKey, any>, [instance.ons]: ons, on };
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
type RefItem<N, S> = {
  type: RefType.ITEM;
  node: N;
  children?: Ref<N, S> | null;
  state: S; // RefItem 的 state 不一定只有 env_ctx, 有可能也有别的，
  // 例如有的平台没有 removeEventListener，只有 addEventListener 时返回的 revoker，则需要把 revoker 放进 state 中
  // state 跟 ctx 不是一回事，不能把 state 放进 ctx 中
};
type RefList<N, S> = {
  type: RefType.LIST;
  list: [Ref<N, S>, ...Ref<N, S>[]];
  state: S;
};
type RefRoxy<N, S> = {
  type: RefType.ROXY;
  rendered: Ref<N, S>;
  state: S;
};
type Ref<N = any, S = any> = RefItem<N, S> | RefList<N, S> | RefRoxy<N, S>;

// ! decorate env
function getHeadNode<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return getHeadNode(ref.list[0]);
  }
  if (ref.type === RefType.ROXY) {
    return getHeadNode(ref.rendered);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getParentNode<N>(ref: Ref<N>, env: Env<N>): N | null {
  if (ref.type === RefType.ITEM) {
    return env.parentNode(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getParentNode(ref.list[0], env);
  }
  if (ref.type === RefType.ROXY) {
    return getParentNode(ref.rendered, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getNextSibling<N>(ref: Ref<N>, env: Env): N | null {
  if (ref.type === RefType.ITEM) {
    return env.nextSibling(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getNextSibling(ref.list[ref.list.length - 1], env);
  }
  if (ref.type === RefType.ROXY) {
    return getNextSibling(ref.rendered, env);
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
    return ref.list.forEach((ch) => {
      insertNodes(parentNode, ch, nextSibling, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    return insertNodes(parentNode, ref.rendered, nextSibling, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function removeNodes<N>(parentNode: N, ref: Ref, env: Env) {
  if (ref.type === RefType.ITEM) {
    return env.removeChild(parentNode, ref.node);
  }
  if (ref.type === RefType.LIST) {
    return ref.list.forEach((ch) => {
      removeNodes(parentNode, ch, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    removeNodes(parentNode, ref.rendered, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function replaceNodes<N>(parentNode: N, newRef: Ref, oldRef: Ref, env: Env) {
  insertNodes(parentNode, newRef, getHeadNode(oldRef), env);
  removeNodes(parent, oldRef, env);
}

/**
 * 生命周期执行逻辑。因为要有 onMounted 生命周期，所以 mount 函数不能无中生有创造 node 节点，而应该是父节点直接传给 mount，它才有生命周期。
 * 如果无中生有创建节点，但一开始不执行 onMounted，但用户把创建的 node attatch 时又不会通知框架去执行生命周期。
 * 其他应用也是 createApp().mount(node), 真实操作仍在 mount 那一步。
 */

// mount(vnode, env=env_dom, env_ctx=null, roxy_ctx=null)
type RefRoxyState = string | { ins: ReturnType<typeof instance>, render: ()=>hs.Vnode, result: hs.Vnode, env_ctx: string };
export function mount<N>(
  vnode: hs.Vnode,
  parentNode: N,
  env: Env<N>,
  ctx: any = null,
  env_ctx = '',
): Ref<N, RefRoxyState> {

  // ctx.env | ctx.roxy
  // const creation = env.createNode(vnode, env_ctx);
  // const node = creation.node;
  // env_ctx = creation.ctx;
  // env_ctx = env.mountAttributesBeforeChildren(node, vnode, env_ctx);
  // const children_ref = mount(vnode.props.children, node, env, ctx, env_ctx);

  // env.mountAttributesAfterChildren(node, vnode, env_ctx)

  if (hs.isEmpty(vnode) || hs.isLeaf(vnode)) {
    const node = env.createNode(vnode, env_ctx).node;
    env.insertBefore(parentNode, node, null);
    return {
      type: RefType.ITEM,
      node, // document.createComment('NULL') | document.createTextNode(vnode as string),
      state: env_ctx,
    };
  }
  if (hs.isElement(vnode)) {
    const creation = env.createNode(vnode, env_ctx);
    const node = creation.node;
    env.insertBefore(parentNode, node, null);
    env_ctx = creation.ctx;
    env.mountAttributesBeforeChildren(node, vnode, env_ctx);
    const childrenVnode = vnode.props.children;
    const children = childrenVnode == null ? childrenVnode : mount(childrenVnode, node, env, ctx, env_ctx);
    // if (child != null) insertNodes(node, child, null, env);
    env.mountAttributesAfterChildren(node, vnode, env_ctx);
    return { type: RefType.ITEM, node, children, state: env_ctx };

    // let node: Element;
    // let { type, props } = vnode;
    // if (type === 'svg' && !env.isSvg) {
    //   env = { ...env, isSvg: true };
    // }
    // if (!env.isSvg) {
    //   node = document.createElement(type);
    // } else {
    //   node = document.createElementNS(SVG_NS, type);
    // }

    // mountAttributes(node, props, env);
    // let childrenRef: Ref | null | undefined =
    //   props.children == null ? props.children : mount(props.children, env);
    // /**
    //  * We need to insert content before setting interactive props
    //  * that rely on children been present (e.g select)
    //  */
    // if (childrenRef != null) insertDom(node, childrenRef, null);
    // mountDirectives(node, props, env);
    // return {
    //   type: RefType.SINGLE,
    //   node,
    //   children: childrenRef!,
    // };
  }
  if (hs.isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      list: vnode.map((child) => mount(child, parentNode, env, ctx, env_ctx)) as [any, ...any[]],
      state: env_ctx,
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
    const ins = instance(props, ctx);
    const render = type(props, ins);
    const result = render(props);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    ins[instance.ons].mount?.forEach(l => l());
    const rendered = mount(result, parentNode, env, ins.ctx, env_ctx);
    ins[instance.ons].mounted?.forEach(l => l());
    return {
      type: RefType.ROXY,
      rendered,
      state: { ins, render, result, env_ctx },
    }

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
  ref: Ref<N, RefRoxyState>,
  env: Env,
): Ref<N, RefRoxyState> {
  if (oldVNode === newVNode) {
    return ref;
  } 
  if (hs.isEmpty(newVNode) && hs.isEmpty(oldVNode)) {
    return ref;
  } 
  if (hs.isLeaf(newVNode) && hs.isLeaf(oldVNode)) {
    const node = (ref as RefItem<N, any>).node;
    // 这说明 哪怕 RefItem 也应该有保留 env_ctx 
    env.patchAttributesBeforeChildren(node, newVNode, ref.state as string);
    (ref as RefItem<N, any>).node.nodeValue = newVNode as string;
    return ref;
  } 
  if (
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
