// declare namespace Roxy {
//   type Ctor<P=any, C=any, V=any, I=any> = (initProps: P, context: C) => { render: (props: P) => Element<any>, inject: I }
//   interface Element<C extends Ctor> { }
// }
// declare namespace JSX {
//   interface Element extends Roxy.Element<any> { }
// }

// const C = (p: {name: string}, ctx: {map: number}) => ({ render: () => 'efqerg', inject: {...ctx, nmap: 123} });
// const P = (p: { children: Roxy.Element<typeof C> }) => <div></div>

// const a = <P><C name="dafq"/></P>

declare namespace Roxy {
  interface Ins<P, C> {
    props: P;
    ctx: C;
    update: any;
    watch: any;
    onMounted: any;
    shouldUpdate: any;
  }
  type VNode = null | undefined | false | string | number | Element<any> | VNode[];
  // type Ctor<P=any, C=any, I=any> = 
  interface Ctor<P=any, C=any, I=C> {
    // 没有 expose, expose 支持 props 的一个基本属性 { ref: {current: Map|(m?:Map)=>any} } interface Ctor<P=any, C=any, I=C, E=void> {
    // (initProps: P, instance: Ins<P, C>): { render: (props: P) => Element<any>, inject?: I, expose: E };
    (initProps: P, instance: Ins<P, C>): { render: (props: P) => VNode, inject?: I };
    (initProps: P, instance: Ins<P, C>): (props: P) => VNode;
    // (props: P): VNode;
  }
  interface Element<C extends Ctor> { }
}


declare namespace JSX {
  interface IntrinsicElements {
    [tag: string]: any;
  }
  interface Element extends Roxy.Element<any> { }
}

// function abc<T extends 'a' | 'b', C extends { current: {a:number,b:string}[T] }>(t: T, c: C) {

// }

const A: Roxy.Ctor<{name:string}, {map: number}> = () => () => 'af'
