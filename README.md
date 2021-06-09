# roxy

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

type RoxyComponent<Props={}, Inject={}, Render Expose=never> = (init_props: Props, ctx: {inject: Inject}) => [(props:Props)=>Render, Expose]
```
