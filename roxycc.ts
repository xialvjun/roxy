import * as hs from './h';

const create_object = <P extends object, A>(
  proto: P,
  additional: A,
): Omit<P, keyof A> & A => Object.assign(Object.create(proto) as P, additional);

const noop = ()=>{};

export type Env<N = any> = {
  create_node(vnode: any, ctx: string): { node: N; ctx: string };
  mount_attributes_before_children(node: N, vnode: any, ctx: string): void;
  mount_attributes_after_children(node: N, vnode: any, ctx: string): void;
  patch_attributes_before_children(
    node: N,
    new_vnode: any,
    old_vnode: any,
    ctx: string,
  ): void;
  patch_attributes_after_children(
    node: N,
    new_vnode: any,
    old_vnode: any,
    ctx: string,
  ): void;
  unmount_attributes_before_children(node: N, vnode: any, ctx: string): void;
  unmount_attributes_after_children(node: N, vnode: any, ctx: string): void;
  insert_before(parent_node: N, new_node: N, reference_node?: N | null): void;
  remove_child(parent_node: N, child: N): void;
  parent_node(node: N): N | null;
  next_sibling(node: N): N | null;
};

const queue_microtask =
  queueMicrotask ||
  (typeof Promise !== 'undefined' &&
    ((cb) =>
      Promise.resolve()
        .then(cb)
        .catch((e) =>
          setTimeout(() => {
            throw e;
          }),
        )));

const queue_macrotask =
  typeof MessageChannel !== 'undefined'
    ? (cb: VoidFunction) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = cb;
        port2.postMessage(null);
      }
    : (cb: VoidFunction) => setTimeout(cb);

const task = (pending: boolean, cb: VoidFunction) => {
  // const cb = () => transitions.splice(0, 1).forEach(c => c())
  if (!pending && queue_microtask) {
    // Todo queueMicrotask
    return () => queue_microtask(cb);
  }
  return () => queue_macrotask(cb);
  // if (typeof MessageChannel !== 'undefined') {
  //   const { port1, port2 } = new MessageChannel();
  //   port1.onmessage = cb;
  //   return () => port2.postMessage(null);
  // }
  // return () => setTimeout(cb);
};

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

function create_instance<P = any, C extends object = object>(
  props: P,
  ctx: C | null = null,
  update: (fn?: () => any) => any,
) {
  const ons: Record<keyof EventMap, Function[]> = {} as any;
  const on = <K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => any,
  ) => {
    ons[type] = [...ons[type], listener];
    // return () => {
    //   ons[type].splice(ons[type].indexOf(listener), 1);
    // }
    return () => {
      ons[type] = ons[type].filter((l) => l !== listener);
    };
  };
  return {
    props,
    ctx: Object.create(ctx) as C & Record<PropertyKey, any>,
    [create_instance.ons]: ons,
    on,
    update,
  };
}
create_instance.ons = Symbol('create_instance.ons');

// ! mount reference
const enum RefType {
  ITEM,
  LIST,
  ROXY,
}
type ItemRef<N, S> = {
  type: RefType.ITEM;
  node: N;
  child_ref?: Ref<N, S>;
  state: S; // ItemRef 的 state 不一定只有 env_ctx, 有可能也有别的，
  // 例如有的平台没有 removeEventListener，只有 addEventListener 时返回的 revoker，则需要把 revoker 放进 state 中
  // state 跟 ctx 不是一回事，不能把 state 放进 ctx 中
};
type ListRef<N, S> = {
  type: RefType.LIST;
  ref_list: [Ref<N, S>, ...Ref<N, S>[]];
  state: S;
};
type RoxyRef<N, S> = {
  type: RefType.ROXY;
  result_ref: Ref<N, S>;
  state: S;
};
type Ref<N = any, S = any> = ItemRef<N, S> | ListRef<N, S> | RoxyRef<N, S>;

// ! decorate env
function getHeadNode<N>(ref: Ref<N>): N {
  if (ref.type === RefType.ITEM) {
    return ref.node;
  }
  if (ref.type === RefType.LIST) {
    return getHeadNode(ref.ref_list[0]);
  }
  if (ref.type === RefType.ROXY) {
    return getHeadNode(ref.result_ref);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getParentNode<N>(ref: Ref<N>, env: Env<N>): N | null {
  if (ref.type === RefType.ITEM) {
    return env.parent_node(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getParentNode(ref.ref_list[0], env);
  }
  if (ref.type === RefType.ROXY) {
    return getParentNode(ref.result_ref, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function getNextSibling<N>(ref: Ref<N>, env: Env): N | null {
  if (ref.type === RefType.ITEM) {
    return env.next_sibling(ref.node);
  }
  if (ref.type === RefType.LIST) {
    return getNextSibling(ref.ref_list[ref.ref_list.length - 1], env);
  }
  if (ref.type === RefType.ROXY) {
    return getNextSibling(ref.result_ref, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function insertNodes<N>(
  parent_node: N,
  ref: Ref<N>,
  next_sibling: N | null,
  env: Env,
): void {
  if (ref.type === RefType.ITEM) {
    return env.insert_before(parent_node, ref.node, next_sibling);
  }
  if (ref.type === RefType.LIST) {
    return ref.ref_list.forEach((ch) => {
      insertNodes(parent_node, ch, next_sibling, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    return insertNodes(parent_node, ref.result_ref, next_sibling, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function removeNodes<N>(parent_node: N, ref: Ref, env: Env) {
  if (ref.type === RefType.ITEM) {
    return env.remove_child(parent_node, ref.node);
  }
  if (ref.type === RefType.LIST) {
    return ref.ref_list.forEach((ch) => {
      removeNodes(parent_node, ch, env);
    });
  }
  if (ref.type === RefType.ROXY) {
    removeNodes(parent_node, ref.result_ref, env);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}
function replaceNodes<N>(parent_node: N, newRef: Ref, oldRef: Ref, env: Env) {
  insertNodes(parent_node, newRef, getHeadNode(oldRef), env);
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
  parent_node: N,
  env: Env<N>,
  ctx: any = null,
  env_ctx = '',
): Ref<N, any> {
  // ctx.env | ctx.roxy
  // const creation = env.create_node(vnode, env_ctx);
  // const node = creation.node;
  // env_ctx = creation.ctx;
  // env_ctx = env.mount_attributes_before_children(node, vnode, env_ctx);
  // const children_ref = mount(vnode.props.children, node, env, ctx, env_ctx);

  // env.mount_attributes_after_children(node, vnode, env_ctx)
  if (hs.isEmpty(vnode) || hs.isLeaf(vnode)) {
    const creation = env.create_node(vnode, env_ctx);
    const node = creation.node;
    env_ctx = creation.ctx;
    env.insert_before(parent_node, node, null);
    return { type: RefType.ITEM, node, state: { env_ctx } };
  }
  if (hs.isElement(vnode)) {
    const creation = env.create_node(vnode, env_ctx);
    const node = creation.node;
    // ref 在 node 创建后立即执行，而不用考虑什么 mounted，避免复杂
    (vnode.props as any).ref?.(node);
    env_ctx = creation.ctx;
    env.insert_before(parent_node, node, null);
    env.mount_attributes_before_children(node, vnode, env_ctx);
    const children_vnode = vnode.props.children;
    const child_ref =
      children_vnode === undefined
        ? children_vnode
        : mount(children_vnode, node, env, ctx, env_ctx);
    env.mount_attributes_after_children(node, vnode, env_ctx);
    return { type: RefType.ITEM, node, child_ref, state: { env_ctx, ctx } };
  }
  if (hs.isNonEmptyArray(vnode)) {
    return {
      type: RefType.LIST,
      ref_list: vnode.map((child) =>
        mount(child, parent_node, env, ctx, env_ctx),
      ) as [any, ...any[]],
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

    const { type, props } = vnode;
    let is_dirty = false;
    const update = (fn?: () => any) => {
      is_dirty = true;
      fn && queue_microtask(() => {
        const updated = fn();
        let revoke = noop;
        typeof updated === 'function' && (revoke = on('updated', () => {
          revoke();
          updated();
        }));
      });
      queue_macrotask(() => {
        if (!is_dirty) return;
        is_dirty = false;
        // ons.update?.forEach((l) => l());
        // ons.render?.forEach((l) => l());
        // const result = render(ins.props);
        // ons.rendered?.forEach((l) => l());
        // ons.patch?.forEach((l) => l());
        // // patch 是同步的，子组件直接在 patch 内执行 render 方法，而不是调用子组件的 update 方法
        // patch(parent_node, result, roxy_ref.state.result, roxy_ref, env);
        // ons.patched?.forEach((l) => l());
        // 既然各种子组件的生命周期都要在 patch 里调用，那自己的生命周期也可以在 patch 里调用
        patch(parent_node, {...roxy_ref.state.vnode}, roxy_ref.state.vnode, roxy_ref, env);
      });
    };

    const ons: Record<keyof EventMap, Function[]> = {} as any;
    const _ons: { error: ((e: Error) => void)[] } & { [k in Exclude<keyof EventMap, 'error'>]: (() => void)[] } = {} as any;
    // _ons.error.forEach(l => l());
    const on = <K extends keyof EventMap>(
      type: K,
      listener: (event: EventMap[K]) => any,
    ) => {
      ons[type] = [...ons[type], listener];
      // return () => {
      //   ons[type].splice(ons[type].indexOf(listener), 1);
      // }
      return () => {
        ons[type] = ons[type].filter((l) => l !== listener);
      };
    };
    const ins = {
      props,
      ctx: Object.create(ctx),
      // [create_instance.ons]: ons,
      on,
      update,
    };

    // const ins = create_instance(props, ctx, update);
    // const { [create_instance.ons]: ons } = ins;
    // const _binding = type(props, ins);
    // const binding = typeof _binding === 'function' ? { render: _binding } : _binding;
    // const { render, expose, provide } = binding;
    const render = type(props, ins);
    // ? before mount 应在什么时候运行，render 前还是后，最终决定是 后，因为 render 前的话，在 type 中就可以执行
    // 至于 before update，则是在 render 前执行 --- 感觉 mount 与 update 有不一致。是否应该加个 render/rendered 生命周期
    // 算了，还是放在 render 前吧，跟 update 保持一致。以后如果发现有必要，再加生命周期
    ons.mount?.forEach((l) => l());

    // ! 各种事件函数是否应该放到 queueMicrotask 中执行，不然 在 error 时渲染 error 状态，把所有其他子组件都卸载，要如何尽可能正常卸载
    // 好像不行，error 本身就要在这里 catch
    ons.mount?.forEach(queueMicrotask as any);

    const result = render(props);
    const result_ref = mount(result, parent_node, env, ins.ctx, env_ctx);
    ons.mounted?.forEach((l) => l());
    const a: VoidFunction = () => 123;
    const roxy_ref = {
      type: RefType.ROXY as const,
      result_ref,
      state: { ins, render, result, env_ctx, vnode },
    };
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
  parent_node: N,
  new_vnode: hs.Vnode,
  old_vnode: hs.Vnode,
  ref: Ref<N, any>,
  env: Env<N>,
): Ref<N, any> {
  if (old_vnode === new_vnode) {
    return ref;
  }
  if (hs.isEmpty(new_vnode) && hs.isEmpty(old_vnode)) {
    return ref;
  }
  if (hs.isLeaf(new_vnode) && hs.isLeaf(old_vnode)) {
    const ri = ref as ItemRef<N, any>;
    // 这说明 哪怕 ItemRef 也应该有保留 env_ctx
    env.patch_attributes_before_children(
      ri.node,
      new_vnode,
      old_vnode,
      ri.state.env_ctx,
    );
    env.patch_attributes_after_children(
      ri.node,
      new_vnode,
      old_vnode,
      ri.state.env_ctx,
    );
    return ri;
  }
  if (
    hs.isElement(new_vnode) &&
    hs.isElement(old_vnode) &&
    new_vnode.type === old_vnode.type
  ) {
    const ri = ref as ItemRef<N, any>;
    env.patch_attributes_before_children(
      ri.node,
      new_vnode,
      old_vnode,
      ri.state.env_ctx,
    );
    let oldChildren = old_vnode.props.children;
    let newChildren = new_vnode.props.children;
    if (oldChildren == null) {
      if (newChildren != null) {
        ri.listRef = mount(
          newChildren,
          env.parent_node(ri.node)!,
          env,
          ri.state.ctx,
          ri.state.env_ctx,
        );
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
    patchDirectives(
      ref_single.node as Element,
      new_vnode.props,
      old_vnode.props,
      env,
    );
    return ref_single;

    // const ref_single = ref as RefSingle;
    // if (new_vnode.type === 'svg' && !env.isSvg) {
    //   env = Object.assign({}, env, { isSvg: true });
    // }
    // patchAttributes(ref_single.node as Element, new_vnode.props, old_vnode.props, env);
    // let oldChildren = old_vnode.props.children;
    // let newChildren = new_vnode.props.children;
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
    // patchDirectives(ref_single.node as Element, new_vnode.props, old_vnode.props, env);
    // return ref_single;
  }
  if (isNonEmptyArray(new_vnode) && isNonEmptyArray(old_vnode)) {
    patchChildren(parent_node, new_vnode, old_vnode, ref as RefArray, env);
    return ref;
  }
  if (
    isComponent(new_vnode) &&
    isComponent(old_vnode) &&
    new_vnode.type === old_vnode.type
  ) {
    let ref_parent = ref as RefParent;
    const {
      ins,
      render,
      expose,
      vnode: old_inner_vnode,
    } = ref_parent.childState;
    ins.props = new_vnode.props;
    const new_inner_vnode = render(ins.props);
    let childRef = patch(
      parent_node,
      new_inner_vnode,
      old_inner_vnode,
      ref_parent.childRef,
      env,
    );
    ref_parent.childState.vnode = new_inner_vnode;
    ref_parent.childRef = childRef;
    return ref_parent;
  } else {
    return mount(new_vnode, env);
  }
}

export function unmount();
