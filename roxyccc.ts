type EmptyVNode = false | [] | null | undefined;
type NonEmptyArrayVNode = [VNode, ...VNode[]];
type LeafVNode = string | number | true;
type ElementVNode = { type: string; props: { children?: VNode }; key?: any };
type ComponentVNode = { type: Function; props: {}; key?: any };
export type VNode =
  | EmptyVNode
  | NonEmptyArrayVNode
  | LeafVNode
  | ElementVNode
  | ComponentVNode;

export const is_empty = (c: any): c is EmptyVNode =>
  c === false ||
  (Array.isArray(c) && c.length === 0) ||
  c === null ||
  c === undefined;
export const is_non_empty_array = (c: any): c is [any, ...any[]] =>
  Array.isArray(c) && c.length > 0;
export const is_leaf = (c: any): c is LeafVNode =>
  typeof c === 'string' || typeof c === 'number';
export const is_element = (c: any): c is { type: string } =>
  c && typeof c.type === 'string';
export const is_component = (c: any): c is { type: Function } =>
  c && typeof c.type === 'function';

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
