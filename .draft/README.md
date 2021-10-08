# roxy / roxy-migurdia / roxy-migludia

# api
```tsx
import { render, defineComponent, RoxyComponent } from 'roxy';

const Counter = defineComponent((init_props: AppProps, ctx) => {
  let c = 0;
  const inc = () => {
    // 1:
    c++;
    ctx.refresh();
    // 2:
    ctx.refresh(() => c++);
    // 3:
    ctx.refresh(() => {
      c++;
      return () => console.log('updated:', c);
    });
  };
  ctx.onMounted(() => {
    ctx.refresh(() => c+=100);
  });
  // watch's getters are excuted before render, no matter the render is caused by parent refresh or self refresh
  ctx.watch([props => props.a, props => c], ([props_a, state_c], pv, inv) => {
    console.log(props_a, state_c);
  }, { immediate: true });
  return (props: AppProps) => (
    <button onClick={inc}>{c}</button>
  )
});

const RefCom = defineComponent((init_props: RefComProps, ctx) => {
  let c = 0;
  // provide’s getter better has no complex calculation because getter has no performance optimization
  // provide use getter rather than identity value is to left out modifing provide like `provide('c',c);c++;provide_again('c',c)`
  ctx.provide('counter', () => c);
  // if browser has Proxy, inject is proxy to an object with prototype chain.
  // if browser has no Proxy, inject is just that object, so we need always access inject from ctx, or pass inject to render
  // we can use same pattern to props like inject, all props are proxy, or all are object
  // 不能用 Proxy, 因为它会造成 反射 错误。 
  // `const proxy_props = new Proxy(real_props, {get(t,p,r){return t[p]}})` 这种反射正常
  // `const proxy_props = new Proxy({}, {get(t,p,r){return real_props[p]}})` 这种反射错误 。。。 而 proxy 却没法随时变更 target
  // 
  const inc = () => ctx.refresh(() => c++);
  let button = undefined;
  const button_ref = (ele) => button = ref;
  return {
    render: (props: RefComProps) => (
      <button onClick={inc} ref={button_ref}>{c}</button>
    ),
    // if there's only two member: render/expose, then it seems return array instead of object is ok too
    // 还是用对象语法，因为还有 shouldUpdate 。。。 呃，其实 shouldUpdate 也可以放在 ctx 上，只要一个为 true，就 update
    'expose/ref': { ctx, c, inc, button },
  }
});

const ProvideInjectCom = defineComponent((init_props: Props, ctx) => {
  const {props: _init_props, inject: _init_inject, provide, refresh} = ctx; // refresh 改名为 update 吧
  setInterval(() => {
    // 直接用 ctx 访问 props/inject 永远得到的是最新的值
    ctx.props;
    ctx.inject;
  }, 1000);
})

type RoxyComponent<Props={}, Inject={}, Render, Expose=never> = (init_props: Props, ctx: {inject: Inject}) => [(props:Props)=>Render, Expose]
```

Fragment: 仅仅是一个 symbol... 数组 其实也只是一个 symbol，是或不是 fragment，是或不是数组
Portal: 继承 context，但是不继承事件冒泡
Root: xxx

Portal 本质是 声明式的 vdom 渲染进入一个 指定的 container 内。。。 因为要支持 Fragment，也就是支持 数组，则 Root 和 Portal 都应该也支持数组
(Root) 为了事件代理，可以特殊点，只允许单元素(其实也可以多元素)

单个 Component 是 声明式的 vdom 渲染 补充进入 一个 container 内，之后记住自己的位置，之后 渲染替换 位置处的 多个（因为是数组） 真实dom

是不是可以把 Component，Portal，Root 做归一 。。。 Root 还有 hydrate

mount(new_vdom)
hydrate(new_vdom, old_dom)
ctx：{ old_dom?,  }

mount(new_vdom, parent_dom)
hydrate(new_vdom, old_dom, parent_dom)
ctx: { parent_dom }



### 另外有问题

```tsx
import React from 'react';
let reee = () => {}
const a = <div id="sfa">
    <button>asfqwf</button>
    <button>asfqwf</button>
    {[
        <button key="a">asfqwf</button>,
        <button key="b" ref={reee}>asfqwf</button>,
        [<div>1</div>, <div>2</div>]
    ]}
    <div><button>asfqwf</button></div>
    {[1,2,3,4].map(i => <div>{i}</div>)}
</div>

// jsx: react
var a = React.createElement("div", { id: "sfa" },
    React.createElement("button", null, "asfqwf"),
    React.createElement("button", null, "asfqwf"),
    [
        React.createElement("button", { key: "a" }, "asfqwf"),
        React.createElement("button", { key: "b", ref: reee }, "asfqwf"),
        [React.createElement("div", null, "1"), React.createElement("div", null, "2")]
    ],
    React.createElement("div", null,
        React.createElement("button", null, "asfqwf")),
    [1, 2, 3, 4].map(function (i) { return React.createElement("div", null, i); }));

// jsx: react-jsx
var a = _jsxs("div", __assign({ id: "sfa" }, { children: [_jsx("button", { children: "asfqwf" }, void 0),
        _jsx("button", { children: "asfqwf" }, void 0),
        [
            _jsx("button", { children: "asfqwf" }, "a"),
            _jsx("button", __assign({ ref: reee }, { children: "asfqwf" }), "b"),
            [_jsx("div", { children: "1" }, void 0), _jsx("div", { children: "2" }, void 0)]
        ],
        _jsx("div", { children: _jsx("button", { children: "asfqwf" }, void 0) }, void 0),
        [1, 2, 3, 4].map(function (i) { return _jsx("div", { children: i }, void 0); })] }), void 0);
```

在上面的代码中，约定
字面量的 key: `<div><span key="1"/><span key="2"/></div>`
数组的 key: `<div>{[<span key="1"/>, <span key="2"/>]}</div>`
于是，现在有问题：数组，是应该算作一个组件，还是应该合并到 children 中（把 children flatten），从而 key 的命名空间合并
