type EmptyVnode = false | [] | null | undefined;
type NonEmptyArrayVnode = [Vnode, ...Vnode[]];
type LeafVnode = string | number;
type ElementVnode = { type: string; props: { children?: Vnode }; key?: any };
type ComponentVnode = { type: Function; props: {}; key?: any };
export type Vnode =
  | EmptyVnode
  | NonEmptyArrayVnode
  | LeafVnode
  | ElementVnode
  | ComponentVnode;

export const isEmpty = (c: any): c is EmptyVnode =>
  c === false ||
  (Array.isArray(c) && c.length === 0) ||
  c === null ||
  c === undefined;
export const isNonEmptyArray = (c: any): c is [any, ...any[]] =>
  Array.isArray(c) && c.length > 0;
export const isLeaf = (c: any): c is LeafVnode =>
  typeof c === 'string' || typeof c === 'number';
export const isElement = (c: any): c is { type: string } =>
  typeof c.type === 'string';
export const isComponent = (c: any): c is { type: Function } =>
  c && typeof c.type === 'function';

// 先执行 onMount，再执行 render，render 可能自己失败，也可能内部子组件失败
// 两者都要 onError，onError 内部要清理副作用（其实哪怕用户没写 onError，框架也应该清理副作用）
// 参考 mapbox 组件的执行顺序，此时清理副作用应执行 onUnmounted （它是 onMount 的背面）。。。
// 至于 setup 本身应该是不被认为有副作用的，但是可以把他归类到 onMount 上，即 setup 失败的话，也执行 onUnmounted 去清理
// 等到 render （包括子组件 render 执行成功），应该从子到父开始执行 mounted （render 成功后，patch_dom 不应该失败）
// 然后更新时先执行 onUpdate，在执行 render（又可能自己或者子组件失败），此时如果失败就不用管，因为 dom 并没有更新
// ... 不对，最开始 onMount 之后要清理副作用执行 onUnmounted 其实对于框架的意义主要是 用户之后在 onError 里修复了状态，重新 render，正确
// 但此时 dom 已经被子元素污染了，不知道该怎么 patch 了，onUpdate 对应的 render 没有副作用，那 onMount 的也可以没有
// ! 应该是 patch 和 diff 不能放在一起。要先 diff，后 patch. diff 无副作用，是生成一个 task list, 会遍历当前组件 update 之后 render 出来的树
// 对于原生 dom，是往 task list 里 push，对于组件，是判断是否 unmount，push task，然后调用子组件的 render，再 diff 子组件，push task。。。
// 其实这样就相当于 diff 是一个 generator function... 不对,不是 generator function, 因为generator function 是生成一个 task 就执行一个,反而不对... 直接是 Promise<task[]> 就好
// ! 这里有重点是：千万不要想着用 nested task (即开始执行 task list 后，里面的某一个 task 会 render 子组件，继续 push task)
// 因为这样就子组件 render 出错时，副作用已经发生了
// ... 在这样的无副作用的 diff 之后，就是 patch_dom 了，patch_dom 理论上不能失败，其实 onMount 就可以在这里执行
// （onMount 也不会有失败（框架会 trycatch，内容失败了不是框架的事）），可以把 onMount 放进 task list 里
// 其实理论上在 onMount 里再修改 onMount 也是可以的，就跟 onUpdate 里 update 一样（至少应该可以对父组件 update）。不对，不一样，onUpdate 里 update 是造成 onUpdate 的重新执行，跟修改 onMount 不一样。
// 于是 hooks 用 Set 更好，Set 有与新增时相同的遍历顺序（此为 js 标准），而且遍历过程中新增，新增的一样可以被遍历到（此为 nodejs 实际试验），还可以去重（不确定去重是否好，但其实也没啥不好）
// 主要是 如果是 数组，那它在遍历过程中 又做删除，又做新增，想不出错会比较麻烦，计算有点多，也许影响性能
// ... 另外，mount 和 update 都是先 diff 后 patch_dom，mount 的 diff 有两种 diff_with_empty, diff_with_dom
// ... Env 是不是也要变下，太过依赖 真实Node 的位置了，创建 EmptyVnode 都需要创建个 备注，在某些 Env 下可能没有备注的概念
// 好像也没必要，roxy 框架本身并不使用真实Node，它只是把 真实Node 在 Env 的函数间传递，如果该 Env 需要位置概念，那创建备注的时候就返回位置数值来充当真实Node就好了

// 可视化编程 有 即时模式 和 驻留模式。对应到这里有不同得 等待。例如 即时模式就没必要用 fiber 异步了
// useLayoutEffect 表明 patch_dom 操作中间没停过
// 假如说没有 useLayoutEffect ，那所有的副作用只需要保证顺序就好，至于是不是同步的并不重要，但有 useLayoutEffect，则需要副作用是同步执行的，至少自己以及自己子组件的副作用是同步的
// ! 上面有说有 useLayoutEffect 类似的功能需求，所以 onMounted 必须得与其他副作用同步完成。其实可以完全不这样，可以增加 onMountedSync 即 on('mounted.sync')
// 这样，该异步的就异步，该同步的就同步。框架本身是全异步的，diff 是异步的，run task list - commit 也是异步的（当然，开始 commit 之后，task list 就不变了，别人操作的是另一个数组）

// hydrate 需要拿到全部的 基础元素 的 vnode

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

type Fiber = {
  vnode: any;
  node: any; // node 不一定不重复, 就 Component 的 node 跟其渲染的 this.$el 是同一个 node
}

function diff(vnode: any, fiber: any, )

// 这里有 parent_node.childNodes = [];
function mount_diff(vnode: any, parent_node: any, tasks: any[], env: any, env_ctx: string) {
  if (isEmpty(vnode) || isLeaf(vnode)) {
    return tasks.concat(() => {
      const creation = env.createNode(vnode, env_ctx);
      const node = creation.node;
      env_ctx = creation.ctx;
      env.insertBefore(parent_node, node, null);
    })
    if (isElement(vnode)) {
      let node = null;
      tasks.concat(() => {
        const creation = env.createNode(vnode, env_ctx);
        node = creation.node;
        env_ctx = creation.ctx;
        env.insertBefore(parent_node, node, null);
        env.mountAttributesBeforeChildren(node, vnode, env_ctx);
        const children_vnode = vnode.props.children;
        const tasks = mount_diff(children_vnode, node, [], env, env_ctx);
        env.mountAttributesAfterChildren(node, vnode, env_ctx);
        // return { type: RefType.ITEM, node, children_ref, state: { env_ctx, ctx } };
      })
      tasks.concat()
    }
  }
}

async function diff1(current_vnode: any, previous_vnode: any, parent_node: any): Promise<(()=>void)[]> {
  const [cv, pv, pn] = [current_vnode, previous_vnode, parent_node];
  if (cv === pv) return [];
  if (isEmpty(cv) && isEmpty(pv)) return [];
  let tasks: (()=>void)[] = [];
  return tasks;
  // await delay(1000);
  // yield () => { console.log(cv, pv, pn) };
  // yield* diff1(cv, pv, pn);
  // yield Promise.resolve(() => { console.log(cv) })
}

async function mount(vnode: any, parentNode: any, env: any, ctx: any = null, env_ctx = '') {
  for await (const task of diff1(vnode, null, parentNode)) {
    task();
  }
}

const enum FiberStatus {
  INIT,
  SETUP,
  MOUNT,
  RENDER,
  RENDERED,
  MOUNTED,
  UPDATE,
  UPDATE_RENDER,
  UPDATE_RENDERED,
  UPDATED,
  UNMOUNT,
  UNMOUNTED,
}
type Fiber = {
  vnode: Vnode,
}

const EMPTY_OBJECT = {};
export function h(type: string | Function, props?: any, ...children: any[]) {
  props ??= EMPTY_OBJECT;
  props =
    children.length > 1
      ? Object.assign({}, props, { children })
      : children.length === 1
      ? Object.assign({}, props, { children: children[0] })
      : props;
  const key = props.key;
  if (key !== key) throw new Error('Invalid NaN key');
  return { type, props, key };
}

export function Fragment(init_props: any) {
  return (props: any) => props.children;
}

// type, props, key, __self, __source
export function jsx(type: string|Function, props: any, key: any, __self: any, __source: any) {
  return { type, props, key };
}
