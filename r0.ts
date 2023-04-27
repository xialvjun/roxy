type EmptyVnode = false | [] | null | undefined;
type NonEmptyArrayVnode = [Vnode, ...Vnode[]];
type LeafVnode = string | number;
type ElementVnode = { type: string; props: { children?: Vnode }; key?: any };
type ComponentVnode = { type: Function; props: {}; key?: any };
type Vnode =
  | EmptyVnode
  | NonEmptyArrayVnode
  | LeafVnode
  | ElementVnode
  | ComponentVnode;

const isEmpty = (c: any): c is EmptyVnode =>
  c === false ||
  (Array.isArray(c) && c.length === 0) ||
  c === null ||
  c === undefined;
const isNonEmptyArray = (c: any): c is [any, ...any[]] =>
  Array.isArray(c) && c.length > 0;
const isLeaf = (c: any): c is LeafVnode =>
  typeof c === 'string' || typeof c === 'number';
const isElement = (c: any): c is { type: string } =>
  typeof c.type === 'string';
const isComponent = (c: any): c is { type: Function } =>
  c && typeof c.type === 'function';

type Env<N = any> = {
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
// const env: Env = null!;

// env_ctx 不需要持续的状态，它只是 commit 阶段的传参，所以不用放进 state 里

const enum RefType {
  ITEM,
  LIST,
  ROXY,
}

const sym = Symbol('_');

const try_catch_log = (fn: Function) => {
  try {
    fn();
  } catch (error) {
    console.error(error);
  }
}
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
// const ons_symbol = Symbol('ons');
function instance<P = any, C extends object = object>(props: P, ctx: C | null = null, update: (fn?: ()=>any)=>void) {
  const ons: Record<keyof EventMap, Set<Function>> = {} as any;
  const on = <K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => any,
  ) => {
    ons[type] ??= new Set();
    ons[type].add(listener);
    return () => ons[type].delete(listener);
  };

  const updates: (() => any)[] = [];
  const update = (fn?: ()=>any) => {
    // fn && updates.push(fn);
    // schedule();
    START(['update', fn])
  }
  return { props, ctx: Object.create(ctx) as C & Record<PropertyKey, any>, [sym]: { ons, updates }, on, update };
}


export function mount<N>(
  vnode: Vnode,
  parentNode: N,
  env: Env<N>,
  ctx: any = null,
  env_ctx = '',
): any {
  if (isEmpty(vnode) || isLeaf(vnode)) {
    const { node } = env.createNode(vnode, env_ctx);
    env.insertBefore(parentNode, node, null);
    return { type: RefType.ITEM, node, state: {} };
  }
  if (isElement(vnode)) {
    const creation = env.createNode(vnode, env_ctx);
    const node = creation.node;
    env.insertBefore(parentNode, node, null);
    env.mountAttributesBeforeChildren(node, vnode, env_ctx);
    // props.ref 由 env 去管（可以在 env.createNode 时 mutate vnode.props.ref，也可以在 mountAttributesAfterChildren 去做，后者更好）
    const children_vnode = vnode.props.children;
    const children_ref = children_vnode == null ? children_vnode : mount(children_vnode, node, env, ctx, creation.ctx);
    env.mountAttributesAfterChildren(node, vnode, env_ctx);
    return { type: RefType.ITEM, node, children_ref, state: { env_ctx, ctx } };
  }
  if (isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      ref_list: vnode.map((child) => mount(child, parentNode, env, ctx, env_ctx)) as [any, ...any[]],
      state: { env_ctx, ctx },
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
    function instance(props, ctx) {
      ctx = Object.create(ctx);
      return { ctx }
    }
    const ins = instance(props, ctx, () => {
      // patch(parentNode, )
    });
    // const _binding = type(props, ins);
    // const binding = typeof _binding === 'function' ? { render: _binding } : _binding;
    // const { render, expose, provide } = binding;
    const render = type(props, ins);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    // 算了，还是放在 render 前吧，跟 update 保持一致。以后如果发现有必要，再加生命周期
    ins[instance.ons].mount?.forEach(try_catch_log);
    const result = render(props);
    let resRef = null;
    try {
      resRef = mount(result, parentNode, env, ins.ctx, env_ctx);
    } catch (error) {
      // error 后，需要把 上面的 mount 都给回退，目前回退不了，但之后把 dom 操作都放到列表里统一执行，就可以回腿了。
      // 至于 error 的 listener, 它的执行力修改了 state, 也只是一次 update. 现在这次应该让它 render null
      ins[instance.ons].error?.forEach(l => try_catch_log(() => l(error)));
    }
    ins[instance.ons].mounted?.forEach(try_catch_log);
    return {
      type: RefType.ROXY,
      resRef,
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
