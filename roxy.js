const App = (init_props, instance) => {
  const button_ref = Object.seal({ current: null });
  let c = 0;
  const ConClick = () => instance.update(() => {
    c++;
    return () => console.log('now c is', c);
  });
  let d = 0;
  const DonClick = () => d++;
  instance.provide('d', () => d);
  return (props) => {
    return <div>
      <button ref={button_ref} onClick={ConClick}>{c}</button>
      <button onClick={DonClick}>{d}</button>
      <Bpp c={c} />
    </div>
  }
}

const Bpp = (init_props, instance) => {
  return (props) => {
    return <>
    {[...Array(props.c)].map((_, idx) => <input key={idx} value={idx} />)}
    {[...Array(instance.context.d)].map((_, idx) => <button key={idx} value={idx}>{idx}</button>)}
    </>
  }
}

mount(<App />, document.body);

let parent = document.querySelector('#app');
const context = {};

// 自定义组件的 children 不需要框架去管，因为都在 props 里，由用户去把他们放到 dom 组件的 children 下
let vdom = {tag: App, props: {}};

// context_to_sub 仅初始时生成
let instance = {
  _lifecycles: { onMount: [], onUpdated: [], shouldUpdate, watch: [] },
  _context_to_sub: Object.create(context),
  props: vdom.props,
  context,
  update: () => {},
  provide: (name, getter) => { Object.defineProperty(instance._context_to_sub, name, { get() {return getter()} }) },
  onMount: () => {},
  onUpdated: () => {},
  shouldUpdate: () => {},
  watch: () => {},
}
let { render, expose } = vdom.tag(vdom.props, instance);
props.ref.current = expose;
// props.ref(expose);
let gen_vdom = render(instance.props);
const create = (vdom, context) => {
  if (typeof vdom.tag === 'string') {
    const ele = document.createElement(vdom.tag);
    patch_props(ele, vdom.props);
    // return ele; // 现在不确定这里是该 return element 还是直接把 container 传进来，对 container 做操作
    // 似乎应该直接对 container 做操作，因为 patch_props 就是副作用。。。既然已经副作用了，就集中副作用
    // ! 也不对，似乎返回 primitive vdom 更好，因为这样在做 ssr 时性能更高，比使用 jsdom 模拟一个 dom 环境更好... 但更统一的的确是用 jsdom，类似 react-canvas
    return;
  }
  // if (vdom.tag = Fragment) {
    
  // }
  if (typeof vdom.tag === 'function') {
    let instance = {
      _lifecycles: { onMount: [], onUpdated: [], shouldUpdate, watch: [] },
      _context_to_sub: Object.create(context),
      props: vdom.props,
      context,
      update: () => {},
      provide: (name, getter) => { Object.defineProperty(ins._context_to_sub, name, { get() {return getter()} }) },
      onMount: () => {},
      onUpdated: () => {},
      shouldUpdate: () => {},
      watch: () => {},
    }
    let { render, expose } = vdom.tag(vdom.props, instance);
    vdom.props.ref.current = expose;
    let gen_vdom = render(instance.props);
    let gen_vdoms = [].concat(gen_vdom);
    create(gen_vdom, instance._context_to_sub);
    return;
  }
}
create(gen_vdom, instance._context_to_sub)

let new_gen_vdom = render(instance.props);
const patch = (nvdom, ovdom, context) => {
  
};
patch(new_gen_vdom, gen_vdom, instance._context_to_sub);




// ! 其实可以先 实现 vdom 库，一个 vdom 对应一个真实 dom
// ! 再尝试实现 Component 逻辑
// ! 再实现 Fragment 和 数组
// ! 最后才是 Roxy


// ! 其实可以先 实现 vdom 库，一个 vdom 对应一个真实 dom
const create = (vdom) => {
  if (Array.isArray(vdom)) {
    return vdom.map(it => create(it));
  }
  // undefined, null, false, true, 1, '', 
  if (vdom === null || vdom === undefined || vdom === false) {
    return;
  }
  if (vdom[symbol]) {
    const ele = document.createElement(vdom.tag);
    
    return 
  }
  if (typeof vdom === 'string') {
    return document.createTextNode(vdom);
  }

}
const patch = (vdoms, container, old_vdoms) => {
  
}


export const ErrorBoundry = Symbol('ROXY_ERROR_BOUNDRY');

export const Fragment = (init_props) => (props) => props.children;

const noop = () => null;
export const mount = (vdom, container) => {
  const context = {};

}

const patch = (new_vdom, old_vdom, old_dom, parent) => {
  // if (!old_vdom) {
  //   parent.children.forEach(it => it.remove());
  //   const dom = create_dom(new_vdom);
  //   parent.appendChild(dom);
  //   return;
  // }
  // if (!new_vdom) {
  //   return old_dom.remove();
  // }

  // 原生 DOM 组件的 ref 由框架来实现，而 Component 的 ref 可以由用户自己实现，也可以直接返回个 expose 来实现
  if (typeof new_vdom.tag === 'string') {
    props.ref = createDom();
    return;
  }
  if (typeof new_vdom.tag === 'function') {
    const context = {};
    const noop = () => null;
    const ins = {
      props: new_vdom.props,
      context,
      render: noop,
      expose: undefined,
      update: () => {},
      watch: () => {},
    };
    ins.update = () => {
      // ins.render(ins.props);
    };
    ins.watch = () => {};
    ins.provide = (name, getter) => ins.provided = 
    const { render, expose } = new_vdom.tag(new_vdom.props, );
    ins.update = update;
  }
}

