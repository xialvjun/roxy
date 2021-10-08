// export const REF.SINGLE = 1; // ref with a single dom node
// export const REF.ARRAY = 4; // ref with an array od nodes
// export const REF.PARENT = 8; // ref with a child ref

export const enum RefType {
  SINGLE,
  ARRAY,
  PARENT,
}
// document.addEventListener
export const SVG_NS = 'http://www.w3.org/2000/svg';

type DomNode = Node;
type DomElement = Element;
export type PropDirective = ReturnType<typeof propDirective>;
export type Env = {
  isSvg: boolean;
  directives: Record<string, PropDirective>;
};

function propDirective(prop: string) {
  return {
    mount(element: DomElement, value: any) {
      (element as any)[prop] = value;
    },
    patch(element: DomElement, newValue: any, oldValue: any) {
      if (newValue !== oldValue) {
        (element as any)[prop] = newValue;
      }
    },
    unmount(element: DomElement, value: any) {
      (element as any)[prop] = null;
    },
  };
}

export const DOM_PROPS_DIRECTIVES: Record<string, PropDirective> = {
  selected: propDirective('selected'),
  checked: propDirective('checked'),
  value: propDirective('value'),
  innerHTML: propDirective('innerHTML'),
};

/**
  TODO: activate full namespaced attributes (not supported in JSX)
  const XML_NS = "http://www.w3.org/XML/1998/namespace"
**/
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const NS_ATTRS = {
  show: XLINK_NS,
  actuate: XLINK_NS,
  href: XLINK_NS,
};

export type RefSingle = {
  type: RefType.SINGLE;
  node: DomNode;
  children?: Ref;
};
export type RefArray = {
  type: RefType.ARRAY;
  children: [Ref, ...Ref[]];
};
export type RefParent = {
  type: RefType.PARENT;
  childRef: Ref;
  childState: any;
};
export type Ref = RefSingle | RefArray | RefParent;

export function getDomNode(ref: Ref): DomNode {
  if (ref.type === RefType.SINGLE) {
    return ref.node;
  } else if (ref.type === RefType.ARRAY) {
    return getDomNode(ref.children[0]);
  } else if (ref.type === RefType.PARENT) {
    return getDomNode(ref.childRef);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}

export function getParentNode(ref: Ref): DomNode | null {
  if (ref.type === RefType.SINGLE) {
    return ref.node.parentNode;
  } else if (ref.type === RefType.ARRAY) {
    return getParentNode(ref.children[0]);
  } else if (ref.type === RefType.PARENT) {
    return getParentNode(ref.childRef);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}

export function getNextSibling(ref: Ref): DomNode | null {
  if (ref.type === RefType.SINGLE) {
    return ref.node.nextSibling;
  } else if (ref.type === RefType.ARRAY) {
    return getNextSibling(ref.children[ref.children.length - 1]);
  } else if (ref.type === RefType.PARENT) {
    return getNextSibling(ref.childRef);
  }
  throw new Error('Unkown ref type ' + JSON.stringify(ref));
}

export function insertDom(
  parent: DomNode,
  ref: Ref,
  nextSibling: DomNode | null,
) {
  if (ref.type === RefType.SINGLE) {
    parent.insertBefore(ref.node, nextSibling);
  } else if (ref.type === RefType.ARRAY) {
    ref.children.forEach((ch) => {
      insertDom(parent, ch, nextSibling);
    });
  } else if (ref.type === RefType.PARENT) {
    insertDom(parent, ref.childRef, nextSibling);
  } else {
    throw new Error('Unkown ref type ' + JSON.stringify(ref));
  }
}

export function removeDom(parent: DomNode, ref: Ref) {
  if (ref.type === RefType.SINGLE) {
    parent.removeChild(ref.node);
  } else if (ref.type === RefType.ARRAY) {
    ref.children.forEach((ch) => {
      removeDom(parent, ch);
    });
  } else if (ref.type === RefType.PARENT) {
    removeDom(parent, ref.childRef);
  } else {
    throw new Error('Unkown ref type ' + JSON.stringify(ref));
  }
}

export function replaceDom(parent: DomNode, newRef: Ref, oldRef: Ref) {
  insertDom(parent, newRef, getDomNode(oldRef));
  removeDom(parent, oldRef);
}

export function mountDirectives(domElement: DomElement, props: any, env: any) {
  for (let key in props) {
    if (key in env.directives) {
      env.directives[key].mount(domElement, props[key]);
    }
  }
}

export function patchDirectives(
  domElement: DomElement,
  newProps: any,
  oldProps: any,
  env: any,
) {
  for (let key in newProps) {
    if (key in env.directives) {
      env.directives[key].patch(domElement, newProps[key], oldProps[key]);
    }
  }
  for (let key in oldProps) {
    if (key in env.directives && !(key in newProps)) {
      env.directives[key].unmount(domElement, oldProps[key]);
    }
  }
}

export function unmountDirectives(
  domElement: DomElement,
  props: any,
  env: any,
) {
  for (let key in props) {
    if (key in env.directives) {
      env.directives[key].unmount(domElement, props[key]);
    }
  }
}

// export function mountDirectives(domElement: DomElement, props: any, env: any) {
//   for (let key in props) {
//     if (key in env.directives) {
//       env.directives[key].mount(domElement, props[key]);
//     }
//   }
// }
// mountDirectives 与 mountAttributes 是一回事，只是 mountDirectives 更特殊些，但其实也有通用模式
// 两个区别：
// 1. 先 mountAttributes 后 mountChildren 再后 mountDirectives
// 2. mountAttributes 是在操作中判断属性（setDOMAttribute 可能内部根据不同的key做不同的操作），mountDirectives是先判断属性，后按属性定义的方式操作
// 3. children 特殊主要是 ctx（创建了个 svg 后，下面的元素都用 document.createElementNS 去创建）
// 所以有 mountAttributesBeforeChildren, mountAttributesAfterChildren
// attributes 可能也有先后，所以只提供批量 mountAttributes 的方法，而不是直接调用 setAttribute 方法。
// 创建节点可能也需要 attributes 信息。。。可能不只需要 children 信息，还需要 children 实例。。。
// 需要 children 实例的，vnode 结构实现不了（那需要 父子倒换，但子是多个，只能叠起来），说到底就是不能让多个对象在创建期间就互相依赖，总有一个的依赖是可空的
export function mountAttributes(domElement: DomElement, props: any, env: Env) {
  for (var key in props) {
    if (key === 'key' || key === 'children' || key in env.directives) continue;
    if (key.startsWith('on')) {
      (domElement as any)[key.toLowerCase()] = props[key];
    } else {
      setDOMAttribute(domElement, key, props[key], env.isSvg);
    }
  }
}

export function patchAttributes(
  domElement: DomElement,
  newProps: any,
  oldProps: any,
  env: Env,
) {
  for (var key in newProps) {
    if (key === 'key' || key === 'children' || key in env.directives) continue;
    var oldValue = oldProps[key];
    var newValue = newProps[key];
    if (oldValue !== newValue) {
      if (key.startsWith('on')) {
        (domElement as any)[key.toLowerCase()] = newValue;
      } else {
        setDOMAttribute(domElement, key, newValue, env.isSvg);
      }
    }
  }
  for (key in oldProps) {
    if (
      key === 'key' ||
      key === 'children' ||
      key in env.directives ||
      key in newProps
    )
      continue;
    if (key.startsWith('on')) {
      (domElement as any)[key.toLowerCase()] = null;
    } else {
      domElement.removeAttribute(key);
    }
  }
}

function setDOMAttribute(
  el: DomElement,
  attr: string,
  value: any,
  isSvg: boolean,
) {
  if (value === true) {
    el.setAttribute(attr, '');
  } else if (value === false) {
    el.removeAttribute(attr);
  } else {
    var namespace = isSvg ? (NS_ATTRS as any)[attr] : undefined;
    if (namespace !== undefined) {
      el.setAttributeNS(namespace, attr, value);
    } else {
      el.setAttribute(attr, value);
    }
  }
}
