type EmptyVNode = boolean | [] | null | undefined;
type NonEmptyArrayVNode = [VNode, ...VNode[]];
type LeafVNode = string | number;
type ElementVNode = { type: string; props: { children?: VNode }; key?: any };
type ComponentVNode = { type: Function; props: {}; key?: any };
export type VNode = EmptyVNode | NonEmptyArrayVNode | LeafVNode | ElementVNode | ComponentVNode;

export const is_empty = (c: any): c is EmptyVNode =>
  typeof c === 'boolean' || (Array.isArray(c) && c.length === 0) || c === null || c === undefined;
export const is_non_empty_array = (c: any): c is [any, ...any[]] => Array.isArray(c) && c.length > 0;
export const is_leaf = (c: any): c is LeafVNode => typeof c === 'string' || typeof c === 'number';
export const is_element = (c: any): c is { type: string } => c && typeof c.type === 'string';
export const is_component = (c: any): c is { type: Function } => c && typeof c.type === 'function';

// 更新是 ins.update(() => modify_state() => patched_callback());
// 任务种类和顺序
// 祖 - 父 - 子
// 用户操作：直接修改状态，update-修改状态
// 框架操作：父update - 父render - 父patch - 子render - 子patch （这里省略了 hooks，）
// 框架操作的过程中，所有的间隙 - 里都可以发生很多其他的用户操作（例如 父u - 父r 间发生了 祖update），但是那时候的用户操作引起的框架操作就需要按一定的顺序被编排，才能正常进行
// ? 任何时候都无法阻止用户直接修改状态，甚至直接修改共享状态，所以希望保持状态可预测可能做不到
// 微任务可以修改 dom，但不会渲染 dom，宏任务才会修改并渲染, requestAnimationFrame 是宏任务
// 可以通过 微任务宏任务 来限制间隙 - 里发生奇怪的用户操作（但这好像不对，就不是 Fiber，不能做到动画流畅展示，想要动画流畅展示，
// 好像就得宏任务，直接 requestAnimationFrame, 而且上面的框架操作里省略了 hooks，用户的奇怪操作完全可能是写在 hooks 里的，所以完全不能限制，
// 最多也只有是给用户操作以及其引起的框架操作编上序号，按序号来，但仍然解决不了用户手动直接改状态）
//

// cankao : forgo/fre/preact/decca/deku/petit-dom/snabbdom/mithril.js
// cankao : decca | deku | forgo | fre | mithril.js | petit-dom | preact | snabbdom | 

// ! diff 的要求：异步的，内部有主动暂停逻辑，无副作用的，后来的 diff 能造成前面的 diff 取消自身。
// ! diff 是组件自己的 diff，下一次 diff 能取消上一次 diff。组件 A.update() 触发 A.diff()，然后在没 diff 完成前又 A.parent.update() 触发 A.parent.diff()
// ! A.parent.diff 的过程中会触发 A.diff() 假如此时上一次的 A.diff() 已经结束得到 commit_queue, 自然该 commit_queue 会执行结束。
// ! 如果此时上一次的 A.diff() 还未结束，则会被取消掉。另外，A.parent.diff 也可能不触发 A.diff ，假如做了 vdom 缓存的话
async function diff() {
  let commit_queue = [];
  // ! DIFF_ID 应该不是全局的，而是组件的一个属性，类似表明组件是否 dirty
  let diff_id = DIFF_ID;
  await diff(children);
  if (diff_id !== DIFF_ID) return new Promise<any>(res => {});
  return commit_queue;
}
// ! 所以需要 Fiber 数据结构，Fiber 的类型跟 Ref 一样，ItemRef|ListRef|RoxyRef，然后 Fiber 内部做 diff

// type Fiber = { ftype: 'item', vnode: null }


// ! 分步骤去写，先是只有 合并同步的 update，没有 分时分片，然后再加上分时分片
// 但即使是 合并同步的update，它的逻辑也是
update(task_a);
update(task_b);
function update(task) {
  tasks.push(task);
  queueMicrotask(() => {
    // ! 至少 if (!tasks.length) 这句是执行了多次的
    if (!tasks.length) return;
    const ts = tasks;
    tasks = [];
    do_tasks(ts);
  });
}
// 然后看 do_tasks 到底是什么？它是更新 **特定的** 组件的状态（即运行 task_a()），并 patch **特定的** 组件。所以，要么 task 里有组件引用，要么 do_tasks 里有组件引用
// do_task 并不 patch, 它只是 diff + queueMacrotask(patch) ---- 还没想清楚这里的逻辑，它应有 diff + queueMicrotask + queueMacrotask + patch
// 感觉应该就是 diff + queueMacrotask(patch) 来把 patch 延后，而 diff 却是完整的多次 diff，后面的 diff 的 vdom 替换前面的 vdom
// diff 与 patch 到底如何分离... fre 是 fiber { children: fiber[], next_task: fiber }  next_task = children[0] 组成一个左树优先的
// 这个链出现时 diff 已经结束，所有的都是真实的叶子 dom，直接 patch 就好...
// 也就是 fre 是 diff 时就修改 fiber （dom 的映射对象），然后 patch/commit 时根据 fre 修改 dom

