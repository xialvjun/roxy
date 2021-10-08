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
