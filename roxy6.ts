// type EmptyVnode = false | [] | null | undefined;
// type ArrayVnode = [Vnode, ...Vnode[]];
// type LeafVnode = string | number;
// type EleVnode = { type: string; props: { children?: Vnode }; key?: any };
// type ComVnode = { type: Function; props: {}; key?: any };
// export type Vnode = EmptyVnode | ArrayVnode | LeafVnode | EleVnode | ComVnode;
// null/void, list, leaf/text, real, comp

type Vnull = false | null | undefined | [];
type Vtext = string | number;
type Vreal = { type: string; props: { children?: Vnode }; key?: any };
type Vcomp = { type: Function; props: {}; key?: any };
type Vlist = [Vnode, ...Vnode[]];
export type Vnode = Vnull | Vlist | Vtext | Vreal | Vcomp;

export const isVnull = (c: any): c is Vnull => c === false || c === null || c === undefined || (Array.isArray(c) && c.length === 0);
export const isVtext = (c: any): c is Vtext => typeof c === 'string' || typeof c === 'number';
export const isVreal = (c: any): c is { type: string } => typeof c.type === 'string';
export const isVcomp = (c: any): c is { type: Function } => c && typeof c.type === 'function';
export const isVlist = (c: any): c is [any, ...any[]] => Array.isArray(c) && c.length > 0;

enum RoxyType {
  NULL,
  TEXT,
  REAL,
  COMP,
  LIST,
}

const isRoxyTypeVnode = {
  [RoxyType.NULL]: isVnull,
  [RoxyType.TEXT]: isVtext,
  [RoxyType.REAL]: isVreal,
  [RoxyType.COMP]: isVcomp,
  [RoxyType.LIST]: isVlist,
}

// type Rcommon<N> = {
//   node: N;
//   ctx: any;
//   env_ctx: string;
// };
type Rnull<N> = {
  type: RoxyType.NULL;
  vnode: Vnull;
  node: N;
  ctx: any;
  env_ctx: string;
};
type Rtext<N> = {
  type: RoxyType.TEXT;
  vnode: Vtext;
  node: N;
  ctx: any;
  env_ctx: string;
};
type Rreal<N> = {
  type: RoxyType.REAL;
  vnode: Vreal;
  node: N;
  children: Roxy<N>;
  ctx: any;
  env_ctx: string;
};
type Rcomp<N> = {
  type: RoxyType.COMP;
  vnode: Vcomp;
  result: Roxy<N>;
  ctx: any;
  env_ctx: string;
};
type Rlist<N> = {
  type: RoxyType.LIST;
  vnode: Vlist;
  list: [Roxy<N>, ...Roxy<N>[]];
  ctx: any;
  env_ctx: string;
};
type Roxy<N> = Rnull<N> | Rtext<N> | Rreal<N> | Rcomp<N> | Rlist<N>;

// const enum RoxyType {
//   EMPTY_ROXY,
//   ARRAY_ROXY,
//   LEAF_ROXY,
//   ELE_ROXY,
//   COM_ROXY,
// }

// type EmptyRoxy<N> = {
//   type: RoxyType.EMPTY_ROXY;
//   vnode: EmptyVnode;
//   node: N;
// };
// type ArrayRoxy<N> = {
//   type: RoxyType.ARRAY_ROXY;
//   vnode: ArrayVnode;
//   array: Roxy<N>[];
// };
// type LeafRoxy<N> = {
//   type: RoxyType.LEAF_ROXY;
//   vnode: LeafVnode;
//   node: N;
// };
// type EleRoxy<N> = {
//   type: RoxyType.ELE_ROXY;
//   vnode: EleVnode;
//   node: N;
// };
// type ComRoxy<N> = {
//   type: RoxyType.COM_ROXY;
//   vnode: ComVnode;
//   result: Roxy<N>;
// };
// type Roxy<N> = EmptyRoxy<N> | ArrayRoxy<N> | LeafRoxy<N> | EleRoxy<N> | ComRoxy<N>;

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

// enum RefType {
//   ITEM,
//   LIST,
//   ROXY,
// }
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
  function diff(vnode: Vnode, roxy: Roxy<N>): Task[] {
    let tasks: Task[] = [];
    if (vnode === roxy.vnode) return [];
    if (isVnull(vnode) && roxy.type === RoxyType.NULL) {
      roxy.vnode = vnode;
      return [];
    }
    if (isVtext(vnode) && roxy.type === RoxyType.TEXT) {
      return [
        () => {
          env.patchAttributesBeforeChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx);
          env.patchAttributesAfterChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx);
        },
      ];
    }
    if (isVreal(vnode) && roxy.type === RoxyType.REAL && vnode.type === roxy.vnode.type) {
      tasks.push(() => env.patchAttributesBeforeChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx));
      tasks.push(...diff(vnode.props.children, roxy.children));
      tasks.push(() => env.patchAttributesAfterChildren(roxy.node, vnode, roxy.vnode, roxy.env_ctx));
      return tasks;
    }
    if (isVcomp(vnode) && roxy.type === RoxyType.COMP && vnode.type === roxy.vnode.type) {

    }
    if (isVlist(vnode) && roxy.type === RoxyType.LIST) {
      let old_head = 0;
      let new_head = 0;
      let old_tail = roxy.list.length - 1;
      let new_tail = vnode.length - 1;
      while (old_head <= old_tail && new_head <= new_tail) {
        const old_roxy = roxy.list[old_head], new_vnode = vnode[new_head];
        if (!isRoxyTypeVnode[old_roxy.type](new_vnode) || (old_roxy.vnode as any)?.key !== (new_vnode as any)?.key) break;
        tasks.push(...diff(new_vnode, old_roxy));
        old_head++;
        new_head++;
      }
      while (old_head <= old_tail && new_head <= new_tail) {
        const old_roxy = roxy.list[old_tail], new_vnode = vnode[new_tail];
        if (!isRoxyTypeVnode[old_roxy.type](new_vnode) || (old_roxy.vnode as any)?.key !== (new_vnode as any)?.key) break;
        tasks.push(...diff(new_vnode, old_roxy));
        old_tail--;
        new_tail--;
      }
      

    }
    return [];
  }
  // function diff(cv: Vnode, pv: Vnode, { node, ctx, env_ctx }: { node: N; ctx: any; env_ctx: string }): Task[] {
  //   const tasks: Task[] = [];
  //   if (cv === pv) return [];
  //   if (isEmptyVnode(cv) && isEmptyVnode(pv)) return [];
  //   if (isLeafVnode(cv) && isLeafVnode(pv)) {
  //     return [
  //       () => {
  //         env.patchAttributesBeforeChildren(node, cv, pv, env_ctx);
  //         env.patchAttributesAfterChildren(node, cv, pv, env_ctx);
  //       },
  //     ];
  //   }
  //   if (isArrayVnode(cv) && isArrayVnode(pv)) {
  //     let newStart = 0,
  //       oldStart = 0,
  //       newEnd = cv.length - 1,
  //       oldEnd = pv.length - 1;
  //     while (newStart <= newEnd && oldStart <= oldEnd) {
  //       const oldVnode = pv[oldStart],
  //         newVnode = cv[newStart];
  //     }
  //   }
  //   if (isEleVnode(cv) && isEleVnode(pv) && cv.type === pv.type) {
  //     tasks.push(() => env.patchAttributesBeforeChildren(node, cv, pv, env_ctx));
  //     tasks.push(...diff(cv.props.children, pv.props.children, { node, ctx, env_ctx }));
  //     return tasks;
  //   }
  //   return [];
  // }
}

// AbortController('div', {}, [1,2,3].map(it => it))
// AbortController('div', {}, [1,2,3].map(it => it), 234)
// children 可能是一个带 key 的数组，可能是一个不带 key 但带 false/null 的数组，可能是单个元素，可能数组里有数组
// 则 diff children 的时候
