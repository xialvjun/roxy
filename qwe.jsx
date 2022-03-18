const Setup = defineComponent((init_props, ins) => {
  return init_props.children(init_props, ins);
})

const App = defineComponent((init_props, ins) => {
  ins.ctx;
  ins.on('mount|mounted|update|updated|unmount|unmounted|error', () => {});
  lifecycle(ins).mount(() => {});
  effect(ins, () => {}, []);
  watch(ins, [], (cv, pv, inv) => {}, { immediate: true, pre_or_flush: 'pre' });
  return (props) => {
    return <div>
      <Setup value={0}>
        {(ip, ins) => {
          let v = ip.value;
          const inc = () => ins.update(() => v++);
          const itv = setInterval(inc);
          ins.on('unmount', () => clearInterval(itv));
          
          ins.watch = ()=>{}

          return (p) => <div onClick={inc}>{v}</div>
        }}
      </Setup>
    </div>
  }
})
const noop = () => {};
const default_conds_fn = [() => NaN];
ins.effect(() => {}, [() => 1]);
ins.effect = (effect_fn, conds_fn=default_conds_fn) => {
  // if (!conds_fn) {
  //   return ins.effect(effect_fn, default_conds_fn);
  // }
  if (typeof effect_fn === 'function' && (!conds_fn || (Array.isArray(conds_fn) && conds_fn.every(v => typeof v === 'function'))) ) {
    let clean_up_fn = noop;
    let conds = [];
    let status = 'init';
    ins.on('mounted', () => {
      clean_up_fn = effect_fn();
      conds = conds_fn.map(v => v());
      // status = 
    });
    // ? 也许 effect 的 两个函数是要连续执行的，而不是分开执行的，所以应该都在 updated 的时候去执行。至于前后需要的新旧 props，是靠 闭包获取的
    // ? 也有问题。如果是 update 时执行 clean_up, updated 时执行 effect_fn，则顺序很清晰。可以用于 <Map><Source><Layer /></Source></Map>
    // ? 但这样，对于 fiber 架构则可能多次执行 update，单次执行 updated，则 clean_up 被执行多次，是有问题的
    // ? ------------
    // ? 需要看看 https://github.com/acdlite/react-fiber-architecture -> https://github.com/reactjs/react-basic
    // ? react 作者的主旨是 状态生成 dom，本身其实并不涉及副作用。fiber也并没有管副作用的事情。
    // ? 这样就有问题，我们把 副作用 与 生成/patchDOM 放到一起去了。我们是对比 dom 之后去运行副作用。所以运行副作用应该是在 patchDom 之后一起运行的，
    // ? patchDom 和副作用 是一起运行的，且都不可停顿。。。于是 生命周期 本质上就不能去做副作用，它按理来说只能做些状态的变更
    // ? 例如在 update 里变更状态，从而再次进入 update，让 update 比 updated 多运行一次。生命周期的功能变得非常有限。
    // ? 但其实 副作用 的执行顺序应该是可以变得比 react 更好的（https://github.com/facebook/react/issues/19482）
    // ? 即 副作用的执行 与 patchDom 是混合的，patchDom 就是副作用。patch父 前会先 patch子。相当于执行 父的 clean_up...不确定
    // ？ 就是说，我们需要更多的生命周期，update 和 updated 应该改名 roxy_update, dom_updated, 对应应该增加 dom_update.. 其中 dom_update 和 dom_updated 是一对
    // -----------
    // ? 父子 mounted 问题：总会担心 p_mount - c_mount - c_mounted - p_mounted 这个顺序下，c_mounted 时获取 dom 会获取不到，
    // ? 或者就算获取到，但 dom 并没有实际加载到 document 的 DOM 树上，所以拿不到排版信息。其实要明白，这是 DOM 环境的问题。
    // ? 如果是一个完整的环境，应该一个 dom 元素本身就应该能够独立存在... 然后我们现实要解决 此问题，可以把 dom 完全弄完之后再 c_mounted - p_mounted
    // ins.on('update', () => {
    //   const conds_new = conds_fn.map(v => v());
    //   if (!(conds_new.length === conds.length && conds_new.every((v,i) => v === conds[i]))) {
    //     clean_up_fn();
    //   }
    // });
    ins.on('updated', () => {
      const conds_new = conds_fn.map(v => v());
    });
    ins.on('unmount', () => {
      clean_up_fn();
    });
    return;
  }
  throw new Error('');
  // if (cond && !Array.isArray(cond)) {
  //   throw new Error('');
  // }
  // if (!cond) {
    
  // }
}
