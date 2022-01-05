// // export const REF.SINGLE = 1; // ref with a single dom node
// // export const REF.ARRAY = 4; // ref with an array od nodes
// // export const REF.PARENT = 8; // ref with a child ref

// import type { Node, Element } from './types';

// export const enum RefType {
//   SINGLE,
//   ARRAY,
//   PARENT,
// }

// export const SVG_NS = 'http://www.w3.org/2000/svg';

// export type PropDirective = ReturnType<typeof propDirective>;

// export type Env = {
//   isSvg: boolean;
//   directives: Record<string, PropDirective>;
// };

// function propDirective(prop: string) {
//   return {
//     mount(ele: any, value: any) {
//       ele[prop] = value;
//     },
//     patch(ele: any, newValue: any, oldValue: any) {
//       if (newValue !== oldValue) {
//         ele[prop] = newValue;
//       }
//     },
//     unmount(ele: any, value?: any) {
//       ele[prop] = null;
//     },
//   };
// }

// export const DOM_PROPS_DIRECTIVES: Record<string, PropDirective> = {
//   selected: propDirective('selected'),
//   checked: propDirective('checked'),
//   value: propDirective('value'),
//   innerHTML: propDirective('innerHTML'),
// };

// /**
//   TODO: activate full namespaced attributes (not supported in JSX)
//   const XML_NS = "http://www.w3.org/XML/1998/namespace"
// **/
// const XLINK_NS = 'http://www.w3.org/1999/xlink';
// const NS_ATTRS = {
//   show: XLINK_NS,
//   actuate: XLINK_NS,
//   href: XLINK_NS,
// };

// export type RefSingle = {
//   type: RefType.SINGLE;
//   node: Node;
//   children?: Ref;
// };
// export type RefArray = {
//   type: RefType.ARRAY;
//   children: [Ref, ...Ref[]];
// };
// export type RefParent = {
//   type: RefType.PARENT;
//   childRef: Ref;
//   childState: any;
// };
// export type Ref = RefSingle | RefArray | RefParent;

// export function getNode(ref: Ref): Node {
//   if (ref.type === RefType.SINGLE) {
//     return ref.node;
//   } else if (ref.type === RefType.ARRAY) {
//     return getNode(ref.children[0]);
//   } else if (ref.type === RefType.PARENT) {
//     return getNode(ref.childRef);
//   }
//   throw new Error('Unkown ref type ' + JSON.stringify(ref));
// }

// export function getParentNode(ref: Ref): Node | null {
//   if (ref.type === RefType.SINGLE) {
//     return ref.node.parentNode;
//   } else if (ref.type === RefType.ARRAY) {
//     return getParentNode(ref.children[0]);
//   } else if (ref.type === RefType.PARENT) {
//     return getParentNode(ref.childRef);
//   }
//   throw new Error('Unkown ref type ' + JSON.stringify(ref));
// }

// export function getNextSibling(ref: Ref): Node | null {
//   if (ref.type === RefType.SINGLE) {
//     return ref.node.nextSibling;
//   } else if (ref.type === RefType.ARRAY) {
//     return getNextSibling(ref.children[ref.children.length - 1]);
//   } else if (ref.type === RefType.PARENT) {
//     return getNextSibling(ref.childRef);
//   }
//   throw new Error('Unkown ref type ' + JSON.stringify(ref));
// }

// export function insertDom(
//   parent: Node,
//   ref: Ref,
//   nextSibling: Node | null,
// ) {
//   if (ref.type === RefType.SINGLE) {
//     parent.insertBefore(ref.node, nextSibling);
//   } else if (ref.type === RefType.ARRAY) {
//     ref.children.forEach((ch) => {
//       insertDom(parent, ch, nextSibling);
//     });
//   } else if (ref.type === RefType.PARENT) {
//     insertDom(parent, ref.childRef, nextSibling);
//   } else {
//     throw new Error('Unkown ref type ' + JSON.stringify(ref));
//   }
// }

// export function removeDom(parent: Node, ref: Ref) {
//   if (ref.type === RefType.SINGLE) {
//     parent.removeChild(ref.node);
//   } else if (ref.type === RefType.ARRAY) {
//     ref.children.forEach((ch) => {
//       removeDom(parent, ch);
//     });
//   } else if (ref.type === RefType.PARENT) {
//     removeDom(parent, ref.childRef);
//   } else {
//     throw new Error('Unkown ref type ' + JSON.stringify(ref));
//   }
// }

// export function replaceDom(parent: Node, newRef: Ref, oldRef: Ref) {
//   insertDom(parent, newRef, getNode(oldRef));
//   removeDom(parent, oldRef);
// }

// export function mountDirectives(domElement: Element, props: any, env: any) {
//   for (let key in props) {
//     if (key in env.directives) {
//       env.directives[key].mount(domElement, props[key]);
//     }
//   }
// }

// export function patchDirectives(
//   domElement: Element,
//   newProps: any,
//   oldProps: any,
//   env: any,
// ) {
//   for (let key in newProps) {
//     if (key in env.directives) {
//       env.directives[key].patch(domElement, newProps[key], oldProps[key]);
//     }
//   }
//   for (let key in oldProps) {
//     if (key in env.directives && !(key in newProps)) {
//       env.directives[key].unmount(domElement, oldProps[key]);
//     }
//   }
// }

// export function unmountDirectives(
//   domElement: Element,
//   props: any,
//   env: any,
// ) {
//   for (let key in props) {
//     if (key in env.directives) {
//       env.directives[key].unmount(domElement, props[key]);
//     }
//   }
// }

// export function mountAttributes(domElement: Element, props: any, env: Env) {
//   for (var key in props) {
//     if (key === 'key' || key === 'children' || key in env.directives) continue;
//     if (key.startsWith('on')) {
//       (domElement as any)[key.toLowerCase()] = props[key];
//     } else {
//       setDOMAttribute(domElement, key, props[key], env.isSvg);
//     }
//   }
// }

// export function patchAttributes(
//   domElement: Element,
//   newProps: any,
//   oldProps: any,
//   env: Env,
// ) {
//   for (var key in newProps) {
//     if (key === 'key' || key === 'children' || key in env.directives) continue;
//     var oldValue = oldProps[key];
//     var newValue = newProps[key];
//     if (oldValue !== newValue) {
//       if (key.startsWith('on')) {
//         (domElement as any)[key.toLowerCase()] = newValue;
//       } else {
//         setDOMAttribute(domElement, key, newValue, env.isSvg);
//       }
//     }
//   }
//   for (key in oldProps) {
//     if (
//       key === 'key' ||
//       key === 'children' ||
//       key in env.directives ||
//       key in newProps
//     )
//       continue;
//     if (key.startsWith('on')) {
//       (domElement as any)[key.toLowerCase()] = null;
//     } else {
//       domElement.removeAttribute(key);
//     }
//   }
// }

// function setDOMAttribute(
//   el: Element,
//   attr: string,
//   value: any,
//   isSvg: boolean,
// ) {
//   if (value === true) {
//     el.setAttribute(attr, '');
//   } else if (value === false) {
//     el.removeAttribute(attr);
//   } else {
//     var namespace = isSvg ? (NS_ATTRS as any)[attr] : undefined;
//     if (namespace !== undefined) {
//       el.setAttributeNS(namespace, attr, value);
//     } else {
//       el.setAttribute(attr, value);
//     }
//   }
// }

// export const env = {
//   createNode(vnode: any, ctx: any) {

//   },
  
// };

import type { Env } from './roxy';

// export const createNode: Env['createNode'] = (vnode: any, ctx: any): { node: any, ctx: any } => {
//   if (vnode === false || vnode === null || vnode === undefined || Array.isArray(vnode) && vnode.length === 0) {
//     return { node: document.createComment('roxy'), ctx: 'comment' };
//   }
//   if (typeof vnode === 'string' || typeof vnode === 'number') {
//     return { node: document.createTextNode(vnode+''), ctx: 'text' };
//   }
//   if (vnode.type === 'svg') {
//     return { node: document.createElementNS('', 'svg'), ctx: 'svg' };
//   }
//   return { node: document.createElement(vnode.type), ctx };
// }

// export function mountAttributesBeforeChildren(node: any, vnode: any, ctx: any): any {} // return ctx;

const env: Env = {
  createNode(vnode: any, ctx: any): { node: any, ctx: any } {
    if (vnode === false || vnode === null || vnode === undefined || Array.isArray(vnode) && vnode.length === 0) {
      return { node: document.createComment('roxy'), ctx: 'comment' };
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return { node: document.createTextNode(vnode+''), ctx: 'text' };
    }
    if (vnode.type === 'svg') {
      return { node: document.createElementNS('', 'svg'), ctx: 'svg' };
    }
    return { node: document.createElement(vnode.type), ctx };
  },
  mountAttributesBeforeChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  mountAttributesAfterChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  patchAttributesBeforeChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  // replaceNode?(parentNode: any, newNode: any, oldNode: any): void {}, // 
  patchAttributesAfterChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  unmountAttributesBeforeChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  // removeNode(parentNode: any, child: any): void {},
  unmountAttributesAfterChildren(node: any, vnode: any, ctx: any): any {}, // return ctx;
  insertBefore(parentNode: any, newNode: any, referenceNode?: any): void {}, // return insertedNode = newNode;
  removeChild(parentNode: any, child: any): void {},
  parentNode(node: any): any | null {},
  nextSibling(node: any): any | null {},
}

export = env;
