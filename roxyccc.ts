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
