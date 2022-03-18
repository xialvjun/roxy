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
