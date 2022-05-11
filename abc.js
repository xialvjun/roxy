const MyCom = defineComponent<Props extends {}, Context extends {}, Expose=never, Provide={}>((innit_props, ins) => {
    ins.context;
    return {
        expose: {},
        render: () => <></>,
        provide: {}
    }
})

Object.setPrototypeOf(provide, context);

type ShareNoKeys<A, B> = keyof A & keyof B extends never ? unknown : never;

function defineComponent<Props, Context, Expose, Provide>(init_props: Props, ins: any): {expose: Expose, render: any, provide: Provide & ShareNoKeys<Context, Provide>} {}



// ------------

type ShareNoKeys<A, B> = keyof A & keyof B extends never ? unknown : never;

function abc<A, B>(a: A, b: B & ShareNoKeys<A, B>) {}
abc({ a: 0 }, { b: 9, })
abc({ a: 0 }, { b: 9, a: '0', } as unknown)


const Way1 = defineComponent<Props, Ctx, Expose, Provide>((init_props, ins) => {
  // ins.ctx; // Ctx & Partial<Provide>
  console.log(ins.ctx.abc);
  ins.ctx.new_abc = 234;
  return {
    expose: {},
    render: () => null,
  }
})

const Way2 = defineComponent<Props, Ctx, Expose=null, Provide={}>((init_props, ins) => {
  ins.context; // Required & Partial<Provide>
  return {
    expose: {},
    render: () => null,
    provide: {},
  }
})

type IsIntersect<A, B> = (keyof A & keyof B) extends never ? false : true;

function defineComponent<Props extends {}, Ctx extends {}, Expose=never, Provide, IsIntersect<Ctx, Provide> extends false} >() {}

// type C = {a: string};
// type K = - 'a'|'b';
// const m:K = 'a';
// type X = { [k in keyof C]: never };
// const a: X = { m: 9 };
// a.a

// type HasIntersectionKeys12 = 'a' extends 'b'|'c' ? true : false | 'b' extends 'b'|'c' ? true : false;
// // Object.setPrototypeOf()
// type HasIntersectionKeys11 = 'a'|'b' extends 'b'|'c' ? true : false;
// type A = { a: number, b: string };
// type B = { b: number, c: string };
// type M<A, B> = Omit<A, keyof B> & B;
// type C = M<A, B>;
// type O = Extract<keyof A, keyof B> extends never ? false: true
// type MM = 'a'|'b' extends 'b'|'c' ? true : false;
// type IsIntersect<A, B> = (keyof B) extends (keyof A) ? true : false;
// type II<A, B> = Exclude<keyof A, keyof B> extends never ? true : false;
// type III<A, B> = Extract<keyof A, keyof B> extends never ? false : true;
// const b: IsIntersect<A, B> = false;
// const c: II<A, B> = true;
// const d: III<A, B> = true;
// // const a: C = null!;

// Way2 is better


// ! 先不弄什么 expose provide， expose 就是简单的 props.ref, 子组建怎么处理这 ref 属性是子组建的事情。
// ! 这样的话，return {render, provide} 只有两个属性了，感觉 provide 有点多余，所以就先实现简单的 ctx 了


// ref 的实现思路。。。 因为 typescript 没有 infer 类型，所以可以
const RefCase = (init_props, ins) => {
  const some_ref = h(() => <div>67678</div>);
  some_ref.value;
  // 这时，some_ref 能清晰地拿到 div 的类型，并且在 render 的时候，每次都会重新执行 h 里面的函数。。。
  // 但如果 ts 有 infer 类型，则这种写法感觉并没有太大必要。事实上它也应该有点问题：万一 jsx 把 some_ref 放到了两个位置，那那个 value 是什么？数组吗？顺序是怎样的
  return () => <div>{some_ref}</div>
}