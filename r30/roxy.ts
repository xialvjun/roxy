export type EmptyVnode = false | null | undefined | [];
export type NonEmptyArrayVnode = [Vnode, ...Vnode[]];
export type LeafVnode = string | number;
export type ElementVnode = { type: string; props: { children?: Vnode }; key?: any };
export type ComponentVnode = { type: (...args: any[]) => (...args: any[]) => Vnode; props: {}; key?: any };
export type Vnode = EmptyVnode | NonEmptyArrayVnode | LeafVnode | ElementVnode | ComponentVnode;
export type EnvVnode = EmptyVnode | LeafVnode | ElementVnode;

export const isEmpty = (c: Vnode): c is EmptyVnode => c === false || c === null || c === undefined || (Array.isArray(c) && c.length === 0);
export const isNonEmptyArray = (c: Vnode): c is NonEmptyArrayVnode => Array.isArray(c) && c.length > 0;
export const isLeaf = (c: Vnode): c is LeafVnode => typeof c === 'string' || typeof c === 'number';
export const isElement = (c: Vnode): c is ElementVnode => typeof (c as any)?.type === 'string';
export const isComponent = (c: Vnode): c is ComponentVnode => typeof (c as any)?.type === 'function';

export type Env<N = any, S = any> = {
  createNode(vnode: EnvVnode, parentState: S | null): { node: N; state: S };
  mountAttributesBeforeChildren(node: N, vnode: EnvVnode, state: S): void;
  mountAttributesAfterChildren(node: N, vnode: EnvVnode, state: S): void;
  updateAttributesBeforeChildren(node: N, newVnode: EnvVnode, oldVnode: EnvVnode, state: S): void;
  updateAttributesAfterChildren(node: N, newVnode: EnvVnode, oldVnode: EnvVnode, state: S): void;
  unmountAttributesBeforeChildren(node: N, state: S): void;
  unmountAttributesAfterChildren(node: N, state: S): void;
  //
  insertBefore(parentNode: N, newNode: N, referenceNode: N | null): void;
  removeChild(parentNode: N, child: N): void;
  parentNode(node: N): N | null;
  nextSibling(node: N): N | null;
};

export const queueMacrotask =
  typeof MessageChannel !== 'undefined'
    ? (cb: VoidFunction) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = cb;
        port2.postMessage(null);
      }
    : (cb: VoidFunction) => {
        setTimeout(cb);
      };

export const queueMicrotask =
  typeof window.queueMicrotask !== 'undefined'
    ? window.queueMicrotask
    : typeof Promise !== 'undefined'
    ? (cb: VoidFunction) => Promise.resolve().then(cb)
    : queueMacrotask;

const enum RefType {
  ITEM,
  LIST,
  ROXY,
}
type ItemRef<N, S> = {
  type: RefType.ITEM;
  vnode: EnvVnode;
  node: N;
  childrenRef: Ref<N, S> | null;
  state: S;
};
type ListRef<N, S> = {
  type: RefType.LIST;
  // ListRef 理论上不需要 vnode, 因为它 vnode = refList.map(it => it.vnode)
  // 当然, list 里面又有 list, 则 it.vnode 不一定存在, 还要处理嵌套关系, 直接在数据上就保留下来好了
  vnode: NonEmptyArrayVnode;
  refList: [Ref<N, S>, ...Ref<N, S>[]];
  // parentState: S | null;
};
type RoxyRef<N, S> = {
  type: RefType.ROXY;
  vnode: ComponentVnode;
  // roxy 有的是 key 和 instance/props, 不需要 vnode, 不, 连 key 都不需要。 list 也不需要 vnode
  instance: ReturnType<typeof createInstance>;
  render: (props: any) => Vnode;
  renderedVnode: Vnode;
  renderedRef: Ref<N, S>;
  // parentState: S | null;
};
type Ref<N = any, S = any> = ItemRef<N, S> | ListRef<N, S> | RoxyRef<N, S>;

const symbol = Symbol('roxy');

const tryCatchLog = (fn: Function) => {
  try {
    fn();
  } catch (error) {
    console.error(error);
  }
};

type EventMap = {
  // ? 是 mount - render - rendered - mounted - (update - render - rendered - updated)* - unmount - unmounted
  mount: never;
  mounted: never;
  update: never;
  updated: never;
  unmount: never;
  unmounted: never;
  // error: Error; // error 只有 setup/render 函数，至于别的 hook，都在自己的异步下执行
  // activate/deactivate 都放在 ctx 上，最终 listener 数组是在 KeepAlive 组件上，由 KeepAlive 组件去执行。。。
  // KeepAlive 的实现是通过 Portal 实现的，移除的时候，Portal 到一个未 attach 节点上，加入的时候 Portal 到 KeepAlive 所在节点，这样就从 vdom 的 type 或结构变化 变为了 Portal 的属性变化
  // activate: never;
  // activated: never;
  // deactivate: never;
  // deactivated: never;
};

function createInstance<P = any, C extends {} = {}>(props: P, ctx: C | null = null, doUpdate: () => void) {
  const hooks: Record<keyof EventMap, Set<Function>> = {} as any;
  const on = <K extends keyof EventMap>(type: K, fn: (event: EventMap[K]) => any) => {
    hooks[type] ??= new Set();
    hooks[type].add(fn);
    return () => hooks[type].delete(fn);
  };

  let dirty = false;
  const update = (fn?: () => any) => {
    dirty = true;
    fn && queueMicrotask(fn);
    queueMacrotask(() => {
      dirty && doUpdate();
      dirty = false;
    });
  };

  return {
    props,
    ctx: Object.create(ctx) as C & Record<PropertyKey, any>,
    on,
    update,
    [symbol]: hooks,
  };
}

export function createEnv<N, S>(env: Env<N, S>) {
  return { mount, update, unmount };
  function mount(parentNode: N, referenceNode: N | null, parentState: S | null, vnode: Vnode, ctx: any): Ref<N, S> {
    if (isEmpty(vnode) || isLeaf(vnode)) {
      const { node, state } = env.createNode(vnode, parentState);
      env.insertBefore(parentNode, node, referenceNode);
      return { type: RefType.ITEM, vnode, node, childrenRef: null, state };
    }
    if (isElement(vnode)) {
      const { node, state } = env.createNode(vnode, parentState);
      env.insertBefore(parentNode, node, referenceNode);
      env.mountAttributesBeforeChildren(node, vnode, state);
      // props.ref 由 env 去管（可以在 env.createNode 时 mutate vnode.props.ref，也可以在 mountAttributesAfterChildren 去做，后者更好）
      // 这样，ref 就不是什么特殊属性了。对于组件而言，ref 只是个普通的可以传递的属性，对于标签元素而言，ref 也只是 env 需要处理的一个 attribute
      const childrenVnode = vnode.props.children;
      const childrenRef = childrenVnode == null ? null : mount(node, null, state, childrenVnode, ctx);
      env.mountAttributesAfterChildren(node, vnode, state);
      return { type: RefType.ITEM, vnode, node, childrenRef, state };
    }
    if (isNonEmptyArray(vnode)) {
      return {
        type: RefType.LIST,
        vnode,
        refList: vnode.map(childVnode => mount(parentNode, referenceNode, parentState, childVnode, ctx)) as [any, ...any[]],
        // parentState,
      };
    }
    if (isComponent(vnode)) {
      const { type, props } = vnode;
      const instance = createInstance(props, ctx, () => {
        const vnode = render(instance.props);
        instance[symbol].update?.forEach(tryCatchLog);
        ref.renderedRef = update(ref.renderedRef, parentState, vnode, instance.ctx);
        instance[symbol].updated?.forEach(tryCatchLog);
      });
      const render = type(props, instance);
      const renderedVnode = render(props);
      instance[symbol].mount?.forEach(tryCatchLog);
      const renderedRef = mount(parentNode, referenceNode, parentState, renderedVnode, instance.ctx);
      instance[symbol].mounted?.forEach(tryCatchLog);
      const ref = {
        type: RefType.ROXY as const,
        vnode,
        instance,
        render,
        renderedVnode: renderedVnode,
        renderedRef: renderedRef,
        // parentState,
      };
      return ref;
    }
    throw new Error('mount: Invalid Vnode!');
  }

  function update(ref: Ref<N, S>, parentState: S | null, vnode: Vnode, ctx: any): Ref<N, S> {
    if (ref.vnode === vnode) {
      return ref;
    }
    if (isEmpty(vnode) && isEmpty(ref.vnode)) {
      ref.vnode = vnode;
      return ref;
    }
    if (isLeaf(vnode) && isLeaf(ref.vnode)) {
      const ri = ref as ItemRef<N, S>;
      env.updateAttributesBeforeChildren(ri.node, vnode, ri.vnode, ri.state);
      env.updateAttributesAfterChildren(ri.node, vnode, ri.vnode, ri.state);
      ri.vnode = vnode;
      return ri;
    }
    if (isElement(vnode) && isElement(ref.vnode) && vnode.type === ref.vnode.type) {
      const ri = ref as ItemRef<N, S>;
      env.updateAttributesBeforeChildren(ri.node, vnode, ri.vnode, ri.state);
      let oldChildren = ref.vnode.props.children;
      let newChildren = vnode.props.children;
      if (oldChildren == null) {
        if (newChildren != null) {
          ri.childrenRef = mount(ri.node, null, ri.state, newChildren, ctx);
        }
      } else {
        if (newChildren == null) {
          unmount(ri.childrenRef!);
          ri.childrenRef = null;
        } else {
          ri.childrenRef = update(ri.childrenRef!, ri.state, newChildren, ctx);
        }
      }
      env.updateAttributesAfterChildren(ri.node, vnode, ri.vnode, ri.state);
      ri.vnode = vnode;
      return ri;
    }
    if (isNonEmptyArray(vnode) && isNonEmptyArray(ref.vnode)) {
      const rl = ref as ListRef<N, S>;
      const refList = rl.refList.slice();
      const lastNode = refNodeLast(refList[refList.length - 1]);
      const parentNode = env.parentNode(lastNode)!;
      const referenceNode = env.nextSibling(lastNode);
      rl.refList = vnode.map((v: any) => {
        let foundIdx = -1;
        const foundRef = refList.find((it, idx) => {
          foundIdx = idx;
          const rv: any = it.vnode;
          return v?.key === rv?.key && v?.type === rv?.type;
        });
        if (foundRef) {
          refList.splice(foundIdx, 1);
          return update(foundRef, parentState, v, ctx);
        }
        return mount(parentNode, referenceNode, parentState, v, ctx);
      }) as [any, ...any[]];
      refList.forEach(it => unmount(it));
      rl.vnode = vnode;
      return rl;
    }
    if (isComponent(vnode) && isComponent(ref.vnode) && vnode.type === ref.vnode.type) {
      const rr = ref as RoxyRef<N, S>;
      const renderedVnode = rr.render(vnode.props);
      rr.renderedRef = update(rr.renderedRef, parentState, renderedVnode, rr.instance.ctx);
      rr.renderedVnode = renderedVnode;
      rr.vnode = vnode;
      return rr;
    }
    {
      const referenceNode = refNodeLast(ref);
      const parentNode = env.parentNode(referenceNode)!;
      const newRef = mount(parentNode, referenceNode, parentState, vnode, ctx);
      unmount(ref);
      return newRef;
    }
  }

  function unmount(ref: Ref<N, S>) {
    if (ref.type === RefType.ITEM) {
      env.unmountAttributesBeforeChildren(ref.node, ref.state);
      ref.childrenRef && unmount(ref.childrenRef);
      env.unmountAttributesAfterChildren(ref.node, ref.state);
      env.removeChild(env.parentNode(ref.node)!, ref.node);
    } else if (ref.type === RefType.LIST) {
      ref.refList
        .slice()
        .reverse()
        .forEach(it => unmount(it));
    } else {
      ref.instance[symbol].unmount?.forEach(tryCatchLog);
      unmount(ref.renderedRef);
      ref.instance[symbol].unmounted?.forEach(tryCatchLog);
    }
  }
}

// function refNodeFirst<N>(ref: Ref<N>): N {
//   if (ref.type === RefType.ITEM) {
//     return ref.node;
//   }
//   if (ref.type === RefType.LIST) {
//     return refNodeFirst(ref.refList[0]);
//   }
//   return refNodeFirst(ref.renderedRef);
// }
function refNodeLast<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return refNodeLast(ref.refList[ref.refList.length - 1]);
  }
  return refNodeLast(ref.renderedRef);
}
// function refNodeAll<N>(ref: Ref<N>, nodes: N[] = []): N[] {
//   if (ref.type === RefType.ITEM) {
//     nodes.push(ref.node);
//     return nodes;
//   }
//   if (ref.type === RefType.LIST) {
//     ref.refList.forEach(it => refNodeAll(it, nodes));
//     return nodes;
//   }
//   return refNodeAll(ref.renderedRef, nodes);
// }

export type RoxyComponent<P = {}, C = {}> = (init_props: P, ins: ReturnType<typeof createInstance<P, C>>) => (props: P) => Vnode;
