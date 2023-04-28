type EmptyVnode = false | [] | null | undefined;
type NonEmptyArrayVnode = [Vnode, ...Vnode[]];
type LeafVnode = string | number;
type ElementVnode = { type: string; props: { children?: Vnode }; key?: any };
type ComponentVnode = { type: Function; props: {}; key?: any };
type Vnode = EmptyVnode | NonEmptyArrayVnode | LeafVnode | ElementVnode | ComponentVnode;
type EnvVnode = EmptyVnode | LeafVnode | ElementVnode;


// d-----       2022/05/24     11:10                decca
// d-----       2022/05/24     11:11                deku
// d-----       2022/04/01     20:25                forgo
// d-----       2022/04/06     18:56                fre
// d-----       2022/05/24     11:11                mithril.js
// d-----       2022/05/23     18:44                petit-dom
// d-----       2022/04/01     19:53                preact
// d-----       2022/05/24     11:09                snabbdom

const isEmpty = (c: any): c is EmptyVnode => c === false || (Array.isArray(c) && c.length === 0) || c === null || c === undefined;
const isNonEmptyArray = (c: any): c is [any, ...any[]] => Array.isArray(c) && c.length > 0;
const isLeaf = (c: any): c is LeafVnode => typeof c === 'string' || typeof c === 'number';
const isElement = (c: any): c is { type: string } => typeof c.type === 'string';
const isComponent = (c: any): c is { type: Function } => c && typeof c.type === 'function';

type Env<N = any> = {
  createNode(vnode: EnvVnode, ctx: string): { node: N; ctx: string };
  mountAttributesBeforeChildren(node: N, vnode: EnvVnode, ctx: string): void;
  mountAttributesAfterChildren(node: N, vnode: EnvVnode, ctx: string): void;
  patchAttributesBeforeChildren(node: N, newVnode: EnvVnode, oldVnode: EnvVnode, ctx: string): void;
  patchAttributesAfterChildren(node: N, newVnode: EnvVnode, oldVnode: EnvVnode, ctx: string): void;
  unmountAttributesBeforeChildren(node: N, ctx: string): void;
  unmountAttributesAfterChildren(node: N, ctx: string): void;
  insertBefore(parentNode: N, newNode: N, referenceNode?: N | null): void;
  removeChild(parentNode: N, child: N): void;
  parentNode(node: N): N | null;
  nextSibling(node: N): N | null;
};

// const env: Env = null!;
const dom_env: Env<Node> = {
  createNode(vnode, ctx) {
    const node = isEmpty(vnode)
      ? document.createComment('')
      : isLeaf(vnode)
      ? document.createTextNode(vnode + '')
      : document.createElement(vnode.type);
    return { node, ctx };
  },
  mountAttributesBeforeChildren(node, vnode, ctx) {},
  mountAttributesAfterChildren(node, vnode, ctx) {},
  patchAttributesBeforeChildren(node, newVnode, oldVnode, ctx) {},
  patchAttributesAfterChildren(node, newVnode, oldVnode, ctx) {},
  unmountAttributesBeforeChildren(node, ctx) {},
  unmountAttributesAfterChildren(node, ctx) {},
  insertBefore(parentNode, newNode, referenceNode?) {},
  removeChild(parentNode, child) {},
  parentNode(node) {
    return null;
  },
  nextSibling(node) {
    return null;
  },
};

const queueMacrotask =
  typeof MessageChannel !== 'undefined'
    ? (cb: VoidFunction) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = cb;
        port2.postMessage(null);
      }
    : (cb: VoidFunction) => {
        setTimeout(cb);
      };

const queueMicrotask =
  typeof window.queueMicrotask !== 'undefined'
    ? window.queueMicrotask
    : typeof Promise !== 'undefined'
    ? (cb: VoidFunction) => Promise.resolve().then(cb)
    : queueMacrotask;

// env_ctx 不需要持续的状态，它只是 commit 阶段的传参，所以不用放进 state 里

const enum RefType {
  ITEM,
  LIST,
  ROXY,
}
type ItemRef<N, S> = {
  type: RefType.ITEM;
  vnode: EmptyVnode | LeafVnode | ElementVnode;
  node: N;
  children_ref?: Ref<N, S> | null;
  state: S; // ItemRef 的 state 不一定只有 env_ctx, 有可能也有别的，
  // 例如有的平台没有 removeEventListener，只有 addEventListener 时返回的 revoker，则需要把 revoker 放进 state 中
  // state 跟 ctx 不是一回事，不能把 state 放进 ctx 中
};
type ListRef<N, S> = {
  type: RefType.LIST;
  vnode: NonEmptyArrayVnode;
  ref_list: [Ref<N, S>, ...Ref<N, S>[]];
  state: S;
};
type RoxyRef<N, S> = {
  type: RefType.ROXY;
  vnode: ComponentVnode;
  instance: ReturnType<typeof create>;
  rendered_ref?: Ref<N, S>;
  state: S;
};
type Ref<N = any, S = any> = ItemRef<N, S> | ListRef<N, S> | RoxyRef<N, S>;

const sym = Symbol('_');

const try_catch_log = (fn: Function) => {
  try {
    fn();
  } catch (error) {
    console.error(error);
  }
};
// ! instance
type EventMap = {
  // ? 是 mount - render - rendered - mounted - (update - render - rendered - updated)* - unmount - unmounted
  mount: never;
  mounted: never;
  update: never;
  updated: never;
  unmount: never;
  unmounted: never;
  error: Error; // error 只有 setup/render 函数，至于别的 hook，都在自己的异步下执行
  // activate/deactivate 都放在 ctx 上，最终 listener 数组是在 KeepAlive 组件上，由 KeepAlive 组件去执行。。。
  // KeepAlive 的实现是通过 Portal 实现的，移除的时候，Portal 到一个未 attach 节点上，加入的时候 Portal 到 KeepAlive 所在节点，这样就从 vdom 的 type 或结构变化 变为了 Portal 的属性变化
  // activate: never;
  // activated: never;
  // deactivate: never;
  // deactivated: never;
};

function create<P = any, C extends object = object>(props: P, ctx: C | null = null, do_update: () => void) {
  const listeners: Record<keyof EventMap, Set<Function>> = {} as any;
  const on = <K extends keyof EventMap>(type: K, listener: (event: EventMap[K]) => any) => {
    listeners[type] ??= new Set();
    listeners[type].add(listener);
    return () => listeners[type].delete(listener);
  };

  let dirty = false;
  const update = (fn?: () => any) => {
    dirty = true;
    fn && queueMicrotask(fn);
    queueMacrotask(() => {
      dirty && do_update();
      dirty = false;
    });
  };

  return {
    props,
    ctx: Object.create(ctx) as C & Record<PropertyKey, any>,
    on,
    update,
    [sym]: listeners,
  };
}

export function mount<N>(vnode: Vnode, parentNode: N, env: Env<N>, ctx: any = null, env_ctx = ''): Ref {
  if (isEmpty(vnode) || isLeaf(vnode)) {
    const { node } = env.createNode(vnode, env_ctx);
    env.insertBefore(parentNode, node, null);
    return { type: RefType.ITEM, vnode, node, state: { env_ctx } };
  }
  if (isElement(vnode)) {
    const creation = env.createNode(vnode, env_ctx);
    const node = creation.node;
    env.insertBefore(parentNode, node, null);
    env.mountAttributesBeforeChildren(node, vnode, env_ctx);
    // props.ref 由 env 去管（可以在 env.createNode 时 mutate vnode.props.ref，也可以在 mountAttributesAfterChildren 去做，后者更好）
    // 这样，ref 就不是什么特殊属性了。对于组件而言，ref 只是个普通的可以传递的属性，对于标签元素而言，ref 也只是 env 需要处理的一个 attribute
    const children_vnode = vnode.props.children;
    const children_ref = children_vnode == null ? children_vnode : mount(children_vnode, node, env, ctx, creation.ctx);
    env.mountAttributesAfterChildren(node, vnode, env_ctx);
    return { type: RefType.ITEM, vnode, node, children_ref, state: { env_ctx } };
  }
  if (isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      vnode,
      ref_list: vnode.map(child => mount(child, parentNode, env, ctx, env_ctx)) as [any, ...any[]],
      state: { env_ctx },
    };
  }
  if (isComponent(vnode)) {
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
    // function instance(props, ctx) {
    //   ctx = Object.create(ctx);
    //   return { ctx };
    // }
    const ins = create(props, ctx, () => {
      // 似乎得把 render 包裹进 try/catch 里，因为单纯的子组件自己更新，根本就不涉及到父组件，然后子组件 render 错误，父组件都不知道，哪来的 catch
      // 它这不是父组件 mount 引起子组件 mount，而是单纯 子组件自己 update
      try {
        const vnode = render(ins.props);
        rendered_ref = patch(rendered_ref, vnode, env);
      } catch (error) {
        ins[sym].error?.forEach(l => try_catch_log(() => l(error)));
      }
    });
    // const _binding = type(props, ins);
    // const binding = typeof _binding === 'function' ? { render: _binding } : _binding;
    // const { render, expose, provide } = binding;
    const render = type(props, ins);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    // 算了，还是放在 render 前吧，跟 update 保持一致。以后如果发现有必要，再加生命周期
    ins[sym].mount?.forEach(try_catch_log);
    // 并不是把 render 放进 try/catch 里，因为 setup/render 出错的话，应该是父组件去处理，而不是自己去处理（因为原本就是父组件不相信子组件）
    // 所以 type(props, ins); render(props); 都是在 try/catch 外面调用，出错直接抛，抛给了父组件调用 mount 处的 try/catch
    let rendered_ref: Ref | null = null;
    try {
      const rendered_vnode = render(props);
      rendered_ref = mount(rendered_vnode, parentNode, env, ins.ctx, env_ctx);
    } catch (error) {
      // error 后，需要把 上面的 mount 都给回退，目前回退不了，但之后把 dom 操作都放到列表里统一执行，就可以回腿了。
      // 至于 error 的 listener, 它的执行力修改了 state, 也只是一次 update. 现在这次应该让它 render null
      ins[sym].error?.forEach(l => try_catch_log(() => l(error)));
    }
    ins[sym].mounted?.forEach(try_catch_log);
    return {
      type: RefType.ROXY,
      vnode,
      ins,
      rendered_ref,
      state: { ins, render, rendered_vnode, env_ctx },
    };

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
  // parentNode: Node,
  ref: Ref<N, any>,
  vnode: Vnode,
  // oldVnode: Vnode,
  env: Env<N>
): Ref<N, any> {
  if (ref.vnode === newVnode) {
    return ref;
  }
  if (isEmpty(newVnode) && isEmpty(ref.vnode)) {
    return ref;
  }
  if (isLeaf(newVnode) && isLeaf(ref.vnode)) {
    const ri = ref as ItemRef<N, any>;
    // 这说明 哪怕 ItemRef 也应该有保留 env_ctx
    env.patchAttributesBeforeChildren(ri.node, newVnode, ri.vnode, ri.state.env_ctx);
    env.patchAttributesAfterChildren(ri.node, newVnode, ri.vnode, ri.state.env_ctx);
    return ri;
  }
  if (hs.isElement(newVnode) && hs.isElement(oldVnode) && newVnode.type === oldVnode.type) {
    const ri = ref as ItemRef<N, any>;
    env.patchAttributesBeforeChildren(ri.node, newVnode, oldVnode, ri.state.env_ctx);
    let oldChildren = oldVnode.props.children;
    let newChildren = newVnode.props.children;
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
        ref_single.children = patchInPlace(ref_single.node, newChildren, oldChildren, ref_single.children!, env);
      }
    }
    patchDirectives(ref_single.node as Element, newVnode.props, oldVnode.props, env);
    return ref_single;

    // const ref_single = ref as RefSingle;
    // if (newVnode.type === 'svg' && !env.isSvg) {
    //   env = Object.assign({}, env, { isSvg: true });
    // }
    // patchAttributes(ref_single.node as Element, newVnode.props, oldVnode.props, env);
    // let oldChildren = oldVnode.props.children;
    // let newChildren = newVnode.props.children;
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
    // patchDirectives(ref_single.node as Element, newVnode.props, oldVnode.props, env);
    // return ref_single;
  }
  if (isNonEmptyArray(newVnode) && isNonEmptyArray(oldVnode)) {
    patchChildren(parentNode, newVnode, oldVnode, ref as RefArray, env);
    return ref;
  }
  if (isComponent(newVnode) && isComponent(oldVnode) && newVnode.type === oldVnode.type) {
    let ref_parent = ref as RefParent;
    const { ins, render, expose, vnode: old_inner_vnode } = ref_parent.childState;
    ins.props = newVnode.props;
    const new_inner_vnode = render(ins.props);
    let childRef = patch(parentNode, new_inner_vnode, old_inner_vnode, ref_parent.childRef, env);
    ref_parent.childState.vnode = new_inner_vnode;
    ref_parent.childRef = childRef;
    return ref_parent;
  } else {
    unmount(ref);
    return mount(newVnode, parentNode, env, ref.ctx, ref.env_ctx);
  }
}

export function unmount<N>(
  parentNode: Node,
  // newVnode: Vnode,
  // oldVnode: Vnode,
  ref: Ref<N, any>,
  env: Env<N>
) {
  if (ref.type === RefType.ITEM) {
    env.unmountAttributesBeforeChildren(ref.node);
  }
}

function createEnv<N>(env: Env<N>) {
  function mount()
}
