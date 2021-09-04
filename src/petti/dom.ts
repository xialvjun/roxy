// export const REF.SINGLE = 1; // ref with a single dom node
// export const REF.ARRAY = 4; // ref with an array od nodes
// export const REF.PARENT = 8; // ref with a child ref

export const enum RefType {
  SINGLE,
  ARRAY,
  PARENT,
}

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
