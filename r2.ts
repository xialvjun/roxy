type EmptyVnode = false | null | undefined | [];
type NonEmptyArrayVnode = [Vnode, ...Vnode[]];
type LeafVnode = string | number;
type ElementVnode = { type: string; props: { children?: Vnode }; key?: any };
type ComponentVnode = { type: (...args: any[]) => (...args: any[]) => Vnode; props: {}; key?: any };
type Vnode = EmptyVnode | NonEmptyArrayVnode | LeafVnode | ElementVnode | ComponentVnode;
type EnvVnode = EmptyVnode | LeafVnode | ElementVnode;

const isEmpty = (c: Vnode): c is EmptyVnode => c === false || c === null || c === undefined || (Array.isArray(c) && c.length === 0);
const isNonEmptyArray = (c: Vnode): c is NonEmptyArrayVnode => Array.isArray(c) && c.length > 0;
const isLeaf = (c: Vnode): c is LeafVnode => typeof c === 'string' || typeof c === 'number';
const isElement = (c: Vnode): c is ElementVnode => {
  const a = c as any;
  return !a ? false : typeof a.type === 'string';
};
const isComponent = (c: Vnode): c is ComponentVnode => {
  const a = c as any;
  return !a ? false : typeof a.type === 'function';
};

type Env<N = any, S = any> = {
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

function createInstance<P = any, C extends object = object>(props: P, ctx: C | null = null, doUpdate: () => void) {
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
        ref.renderedRef = update(ref.renderedRef, parentState, vnode, instance.ctx);
      });
      const render = type(props, instance);
      instance[symbol].mount?.forEach(tryCatchLog);
      const renderedVnode = render(props);
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
      return ri;
    }
    if (isNonEmptyArray(vnode) && isNonEmptyArray(ref.vnode)) {
      const rl = ref as ListRef<N, S>;
      const refList = rl.refList.slice();
      const lastNode = refNodeLast(refList[refList.length - 1]);
      const parentNode = env.parentNode(lastNode)!;
      const referenceNode = env.nextSibling(lastNode);
      rl.refList = vnode
        .map((v: any) => {
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
      return rl;
    }
    if (isComponent(vnode) && isComponent(ref.vnode) && vnode.type === ref.vnode.type) {
      const rr = ref as RoxyRef<N, S>;
      const renderedVnode = rr.render(vnode.props);
      rr.renderedRef = update(rr.renderedRef, parentState, renderedVnode, rr.instance.ctx);
      return rr;
    }
    {
      const thisNode = refNodeFirst(ref);
      const parentNode = env.parentNode(thisNode)!;
      const newRef = mount(parentNode, thisNode, parentState, vnode, ctx);
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
      unmount(ref.renderedRef);
    }
  }
}

// env_ctx 不用字符串了，如果面对稍微复杂的信息，可能就要不断的序列化反序列化了
// 直接 env 返回什么就是什么，是否要 Object.create(upper_ctx) 由 env 自己决定
// 信息足够简单的话，它也可以返回字符串
export function mount<N, S>(
  vnode: Vnode,
  parentNode: N,
  env: Env<N, S>,
  ctx: any,
  parentState: S | null,
  referenceNode: N | null
): Ref<N, S> {
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
    const childrenRef = childrenVnode == null ? null : mount(childrenVnode, node, env, ctx, state, null);
    env.mountAttributesAfterChildren(node, vnode, state);
    return { type: RefType.ITEM, vnode, node, childrenRef, state };
  }
  if (isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      vnode,
      refList: vnode.map(child => mount(child, parentNode, env, ctx, parentState, referenceNode)) as [any, ...any[]],
      parentState,
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
    const instance = createInstance(props, ctx, () => {
      // 似乎得把 render 包裹进 try/catch 里，因为单纯的子组件自己更新，根本就不涉及到父组件，然后子组件 render 错误，父组件都不知道，哪来的 catch
      // 它这不是父组件 mount 引起子组件 mount，而是单纯 子组件自己 update
      // try {
      // todo: 也许 render 放 try 外面，patch 放里面
      const vnode = render(instance.props);
      ref.renderedRef = patch(ref.renderedRef, vnode, env, instance.ctx, parentState);
      // } catch (error) {
      //   instance[symbol].error?.forEach(l => tryCatchLog(() => l(error)));
      // }
    });
    // const _binding = type(props, ins);
    // const binding = typeof _binding === 'function' ? { render: _binding } : _binding;
    // const { render, expose, provide } = binding;
    const render = type(props, instance);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    // 算了，还是放在 render 前吧，跟 update 保持一致。以后如果发现有必要，再加生命周期
    instance[symbol].mount?.forEach(tryCatchLog);
    // 并不是把 render 放进 try/catch 里，因为 setup/render 出错的话，应该是父组件去处理，而不是自己去处理（因为原本就是父组件不相信子组件）
    // 所以 type(props, ins); render(props); 都是在 try/catch 外面调用，出错直接抛，抛给了父组件调用 mount 处的 try/catch
    // 不对，父组件 mount 也没有 try/catch ，因为所有组件 mount 都没有 try/catch.. 而是 子组件mount，父组件update时 ，父组件才 try
    // let rendered_ref: Ref = null!;
    // let rendered_vnode: Vnode = null;
    // try {
    //   rendered_vnode = render(props);
    //   rendered_ref = mount(rendered_vnode, parentNode, env, ins.ctx, env_ctx);
    // } catch (error) {
    //   // error 后，需要把 上面的 mount 都给回退，目前回退不了，但之后把 dom 操作都放到列表里统一执行，就可以回腿了。
    //   // 至于 error 的 listener, 它的执行力修改了 state, 也只是一次 update. 现在这次应该让它 render null
    //   ins[sym].error?.forEach(l => tryCatchLog(() => l(error)));
    // }
    // ins[sym].mounted?.forEach(tryCatchLog);
    // return {
    //   type: RefType.ROXY,
    //   vnode,
    //   ins,
    //   rendered_ref,
    //   state: { ins, render, rendered_vnode, env_ctx },
    // };
    const renderedVnode = render(props);
    const renderedRef = mount(renderedVnode, parentNode, env, instance.ctx, parentState);
    instance[symbol].mounted?.forEach(tryCatchLog);
    const ref = {
      type: RefType.ROXY as const,
      vnode,
      instance,
      render,
      renderedVnode: renderedVnode,
      renderedRef: renderedRef,
      parentState,
    };
    return ref;

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

// Ref 自己的 state 都在 ref 实例内部，Ref 的无关的 state 都在 ref.state 里
// Env 只是一系列函数，是单例的，没有 state，但是它有 State 泛型
// mount 只有一个 state，是 parentState，patch 则有两个 state，一个是 ref.state 一个是 parentState
export function patch<N, S>(ref: Ref<N, S>, vnode: Vnode, env: Env<N, S>, ctx: any, parentState: S | null): Ref<N, S> {
  if (ref.vnode === vnode) {
    return ref;
  }
  if (isEmpty(vnode) && isEmpty(ref.vnode)) {
    ref.vnode = vnode;
    return ref;
  }
  if (isLeaf(vnode) && isLeaf(ref.vnode)) {
    const ri = ref as ItemRef<N, S>;
    // 这说明 哪怕 ItemRef 也应该有保留 env_ctx
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
        ri.childrenRef = mount(newChildren, ri.node, env, ctx, ri.state);
        // insertDom(ref_single.node, ref_single.children, null);
      }
    } else {
      if (newChildren == null) {
        // ref_single.node.textContent = '';
        unmount(ri.childrenRef!, env);
        ri.childrenRef = null;
      } else {
        ri.childrenRef = patch(ri.childrenRef!, newChildren, env, ctx, parentState);
        // ref_single.children = patchInPlace(ref_single.node, newChildren, oldChildren, ref_single.children!, env);
      }
    }
    return ri;
    // patchDirectives(ref_single.node as Element, newVnode.props, oldVnode.props, env);
    // return ref_single;

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
  if (isNonEmptyArray(vnode) && isNonEmptyArray(ref.vnode)) {
    // patchChildren(parentNode, newVnode, oldVnode, ref as RefArray, env);
    const rl = ref as ListRef<N, S>;
    if (vnode.length === 1 && rl.vnode.length === 1) {
      rl.refList[0] = patch(rl.refList[0], vnode[0], env, ctx, parentState);
      return rl;
    }
    const ovs = rl.vnode,
      nvs = vnode;
    const refList = Array(nvs.length);
    let oa = 0,
      na = 0,
      ob = ovs.length - 1,
      nb = nvs.length - 1;
    let ov: any, nv: any, refMap: any;
    while (oa <= ob && na <= nb) {
      ov = ovs[oa];
      nv = nvs[na];
      if (ov?.key == nv?.key) {
        refList[na] = patch(rl.refList[na], ov, env, ctx, parentState);
        oa++;
        na++;
        continue;
      }
      ov = ovs[ob];
      nv = nvs[nb];
      if (ov?.key === nv?.key) {
        refList[nb] = patch(rl.refList[nb], ov, env, ctx, parentState);
        ob--;
        nb--;
        continue;
      }
      if (!refMap) {
        refMap = {};
        for (let i = oa; i <= ob; i++) {
          const ov: any = ovs[i];
          if (ov?.key != null) {
            refMap[ov.key] = i;
          }
        }
      }
      nv = nvs[na];
      const idx = nv?.key != null ? refMap[nv.key] : null;
      if (idx != null) {
        ov = ovs[idx];
        patch(rl.refList[idx], ov, env, ctx, parentState);

        refList[idx];
      }

      // newVNode = newChildren[newStart] as any;
      // const idx = newVNode?.key != null ? refMap[newVNode.key] : null;
      // if (idx != null) {
      //   oldVNode = oldchildren[idx];
      //   oldRef = refChildren[idx];
      //   newRef = children[newStart] = patch(
      //     parentDomNode,
      //     newVNode,
      //     oldVNode,
      //     oldRef,
      //     env,
      //   );
      //   insertDom(parentDomNode, newRef, getDomNode(refChildren[oldStart]));
      //   if (newRef !== oldRef) {
      //     removeDom(parentDomNode, oldRef);
      //     unmount(oldVNode, oldRef, env);
      //   }
      //   refChildren[idx] = null;
      // } else {
      //   newRef = children[newStart] = mount(newVNode, env);
      //   insertDom(parentDomNode, newRef, getDomNode(refChildren[oldStart]));
      // }
      // newStart++;
    }
    return rl;
  }
  if (isComponent(vnode) && isComponent(ref.vnode) && vnode.type === ref.vnode.type) {
    // let ref_parent = ref as RefParent;
    // const { ins, render, expose, vnode: old_inner_vnode } = ref_parent.childState;
    // ins.props = newVnode.props;
    // const new_inner_vnode = render(ins.props);
    // let childRef = patch(parentNode, new_inner_vnode, old_inner_vnode, ref_parent.childRef, env);
    // ref_parent.childState.vnode = new_inner_vnode;
    // ref_parent.childRef = childRef;
    // return ref_parent;
    const rr = ref as RoxyRef<N, S>;
    const renderedVnode = rr.render(vnode.props);
    rr.renderedRef = patch(rr.renderedRef, renderedVnode, env, rr.instance.ctx, parentState);
    return rr;
  }
  const parentNode = env.parentNode(refNode(ref))!;
  unmount(ref, env);
  return mount(vnode, parentNode, env, ctx, parentState);
}

// function refNode<N>(ref: Ref<N>): N {
//   if (ref.type === RefType.ITEM) {
//     return ref.node;
//   }
//   if (ref.type === RefType.LIST) {
//     return refNode(ref.refList[0]);
//   }
//   return refNode(ref.renderedRef);
// }

function refNodeFirst<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return refNodeFirst(ref.refList[0]);
  }
  return refNodeFirst(ref.renderedRef);
}
function refNodeLast<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return refNodeLast(ref.refList[ref.refList.length - 1]);
  }
  return refNodeLast(ref.renderedRef);
}
function refNodeAll<N>(ref: Ref<N>, nodes: N[] = []): N[] {
  if (ref.type === RefType.ITEM) {
    nodes.push(ref.node);
    return nodes;
  }
  if (ref.type === RefType.LIST) {
    ref.refList.forEach(it => refNodeAll(it, nodes));
    return nodes;
  }
  return refNodeAll(ref.renderedRef, nodes);
}

// function refState<S>(ref: Ref<any, S>): S | null {
//   if (ref.type === RefType.ITEM) {
//     return ref.state;
//   }
//   return ref.parentState;
// }

export function unmount<N>(ref: Ref<N, any>, env: Env<N>) {
  if (ref.type === RefType.ITEM) {
    env.unmountAttributesBeforeChildren(ref.node, ref.state);
    ref.childrenRef && unmount(ref.childrenRef, env);
    env.unmountAttributesAfterChildren(ref.node, ref.state);
    // todo: unmount 需要 removeChild , mount 需要 insertBefore 。。。
    // 原本应该就 node.insertSiblingBeforeSelf(newNode) / node.remove() 不过 root 没有 node, 总不能 null.insertSiblingBeforeSelf
    // 事实上 DOM 原本就有 Element.replaceWith/remove ，只要把这两个方法扩展到 Node 上就可以。应该许多浏览器本身就有扩展到 Node 上
    // env.removeChild(env.parentNode(ref.node)!, ref.node);
    // env.remove(ref.node); // 用 replaceWith 的话，就不是在 unmount 里 remove 了
    // 不行，只有 replaceWith/remove 的话，没法添加子元素，除非还有个 appendChildComment
    // 这样复杂度就上升了，而且新增元素，还得先 appendChildComment 后，才能 replaceWith, 多了一步
  } else if (ref.type === RefType.LIST) {
    ref.refList
      .slice()
      .reverse()
      .forEach(it => unmount(it, env));
  } else {
    unmount(ref.renderedRef, env);
  }
}
