export const EMPTY_OBJECT = {};

// const VTYPE_ELEMENT = 1;
// const VTYPE_FUNCTION = 2;
// const VTYPE_COMPONENT = 4;

// export const enum VTYPE {
//   ELEMENT,
//   COMPONENT,
// }

type EmptyVnode = false | [] | null | undefined;
export type NonEmptyArrayVnode = [VNode, ...Vnode[]];
type LeafVnode = string | number;
type ElementVnode = { type: string; props: { children?: VNode }; key?: any };
type ComponentVnode = { type: Function; props: {}; key?: any };
type Vnode = EmptyVnode | NonEmptyArrayVnode | LeafVnode | ElementVnode | ComponentVnode;

export type VNode =
  | undefined
  | null
  | false
  | []
  | number
  | string
  | { type: string; props: { children?: VNode }; key?: any }
  | { type: Function; props: {}; key?: any }
  | [VNode, ...VNode[]];

export const isEmpty = (c: any): c is null | undefined | false | [] =>
  c === false ||
  (Array.isArray(c) && c.length === 0) ||
  c === null ||
  c === undefined;
export const isNonEmptyArray = (c: any): c is [any, ...any[]] =>
  Array.isArray(c) && c.length > 0;
export const isLeaf = (c: any): c is string | number =>
  typeof c === 'string' || typeof c === 'number';
export const isElement = (c: any): c is { type: string; props: any } =>
  typeof c.type === 'string';
export const isComponent = (c: any): c is ComponentVnode => typeof c.type === 'function';

// const isValidComponentType = (c) => typeof c?.mount === 'function';

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

  // return jsx(type, props, props.key);
}

// export function jsx(type, props, key) {
//   if (key !== key) throw new Error('Invalid NaN key');
//   const vtype =
//     typeof type === 'string'
//       ? VTYPE_ELEMENT
//       : isValidComponentType(type)
//       ? VTYPE_COMPONENT
//       : typeof type === 'function'
//       ? VTYPE_FUNCTION
//       : undefined;
//   if (vtype === undefined) throw new Error('Invalid VNode type');
//   return {
//     vtype,
//     type,
//     key,
//     props,
//   };
// }

// export const jsxs = jsx;

export function Fragment(props: any) {
  return props.children;
}
