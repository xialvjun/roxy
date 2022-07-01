type EmptyVnode = false | [] | null | undefined;
type ArrayVnode = [Vnode, ...Vnode[]];
type LeafVnode = string | number;
type EleVnode = { type: string; props: { children?: Vnode }; key?: any };
type ComVnode = { type: Function; props: {}; key?: any };
export type Vnode = EmptyVnode | ArrayVnode | LeafVnode | EleVnode | ComVnode;
// null/void, list, leaf/text, real, comp

export const isEmptyVnode = (c: any): c is EmptyVnode =>
  c === false || (Array.isArray(c) && c.length === 0) || c === null || c === undefined;
export const isArrayVnode = (c: any): c is [any, ...any[]] => Array.isArray(c) && c.length > 0;
export const isLeafVnode = (c: any): c is LeafVnode => typeof c === 'string' || typeof c === 'number';
export const isEleVnode = (c: any): c is { type: string } => typeof c.type === 'string';
export const isComVnode = (c: any): c is { type: Function } => c && typeof c.type === 'function';

const enum RoxyType {
  EMPTY_ROXY,
  ARRAY_ROXY,
  LEAF_ROXY,
  ELE_ROXY,
  COM_ROXY,
}

type EmptyRoxy<N> = {
  type: RoxyType.EMPTY_ROXY,
  vnode: EmptyVnode,
  node: N;
}
type ArrayRoxy<N> = {
  type: RoxyType.ARRAY_ROXY,
  vnode: ArrayVnode,
  array: Roxy<N>[],
}
type LeafRoxy<N> = {
  type: RoxyType.LEAF_ROXY,
  vnode: LeafVnode,
  node: N;
}
type EleRoxy<N> = {
  type: RoxyType.ELE_ROXY,
  vnode: EleVnode,
  node: N;
}
type ComRoxy<N> = {
  type: RoxyType.COM_ROXY,
  vnode: ComVnode,
  result: Roxy<N>,
}
type Roxy<N> = EmptyRoxy<N> | ArrayRoxy<N> | LeafRoxy<N> | EleRoxy<N>| ComRoxy<N>;

const PRIVATE = Symbol('roxy_private_symbol');

const try_catch_log = (fn: Function) => {
  try {
    fn();
  } catch (error) {
    console.error(error);
  }
};
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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

type Task = () => void;


enum RefType {
  ITEM,
  LIST,
  ROXY,
}
// type ItemRef<N, S> = {
//   type: RefType.ITEM;
//   node: N;
//   children_ref?: Ref<N, S>;
//   state: S; // ItemRef 的 state 不一定只有 env_ctx, 有可能也有别的，
//   // 例如有的平台没有 removeEventListener，只有 addEventListener 时返回的 revoker，则需要把 revoker 放进 state 中
//   // state 跟 ctx 不是一回事，不能把 state 放进 ctx 中
// };
// type ListRef<N, S> = {
//   type: RefType.LIST;
//   ref_list: [Ref<N, S>, ...Ref<N, S>[]];
//   state: S;
// };
// type RoxyRef<N, S> = {
//   type: RefType.ROXY;
//   result_ref: Ref<N, S>;
//   state: S;
// };
// type Ref<N = any, S = any> = ItemRef<N, S> | ListRef<N, S> | RoxyRef<N, S>;


// Fiber 里有 vnode, 不一定有 node, 只 empty, leaf 和 element 才有 node, component 和 list 都没有 node
function createRoxy<N>(env: Env<N>) {
  type Fib = {
    node: N;
    vnode: Vnode;
    ctx: any;
    env_ctx: string;
  };
  function diff1(vnode: Vnode, roxy: Roxy<N>): Task[] {
    if (vnode === roxy.vnode) return [];
    if (isEmptyVnode(vnode) && roxy.type === RoxyType.EMPTY_ROXY) {
      roxy.vnode = vnode;
      return [];
    }
    if (isLeafVnode(vnode) && roxy.type === RoxyType.LEAF_ROXY) {
      return [() => {
        env.patchAttributesBeforeChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx);
        env.patchAttributesAfterChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx);
      }];
    }
    if (isArrayVnode(vnode) && roxy.type === RoxyType.ARRAY_ROXY) {
      let old_head = 0, new_head = 0, old_tail = roxy.vnode.length - 1, new_tail = vnode.length - 1;
      while (old_head <= old_tail && new_head <= new_tail) {
        // const old_vnode = vnode[old_head], new_vnode = roxy.vnode[new_head];


      }
    }
    return [];
  }
  function diff(cv: Vnode, pv: Vnode, {node, ctx, env_ctx}: {node: N, ctx: any, env_ctx: string}): Task[] {
    const tasks: Task[] = [];
    if (cv === pv) return [];
    if (isEmptyVnode(cv) && isEmptyVnode(pv)) return [];
    if (isLeafVnode(cv) && isLeafVnode(pv)) {
      return [
        () => {
          env.patchAttributesBeforeChildren(node, cv, pv, env_ctx);
          env.patchAttributesAfterChildren(node, cv, pv, env_ctx);
        },
      ];
    }
    if (isArrayVnode(cv) && isArrayVnode(pv)) {
      let newStart = 0,
        oldStart = 0,
        newEnd = cv.length - 1,
        oldEnd = pv.length - 1;
      while (newStart <= newEnd && oldStart <= oldEnd) {
        const oldVnode = pv[oldStart], newVnode = cv[newStart];

      }
    }
    if (isEleVnode(cv) && isEleVnode(pv) && cv.type === pv.type) {
      tasks.push(() => env.patchAttributesBeforeChildren(node, cv, pv, env_ctx));
      tasks.push(...diff(cv.props.children, pv.props.children, { node, ctx, env_ctx }));
      return tasks;
    }
    return [];
  }
}


// AbortController('div', {}, [1,2,3].map(it => it))
// AbortController('div', {}, [1,2,3].map(it => it), 234)
// children 可能是一个带 key 的数组，可能是一个不带 key 但带 false/null 的数组，可能是单个元素，可能数组里有数组
// 则 diff children 的时候
