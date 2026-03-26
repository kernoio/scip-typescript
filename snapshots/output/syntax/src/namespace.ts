// < definition syntax src/`namespace.ts`/

export declare namespace a {
//                       ^ definition syntax src/`namespace.ts`/a/
  function hello(): string
//         ^^^^^ definition syntax src/`namespace.ts`/a/hello().
  interface Interface {
//          ^^^^^^^^^ definition syntax src/`namespace.ts`/a/Interface#
    hello: string
//  ^^^^^ definition syntax src/`namespace.ts`/a/Interface#hello.
  }
  var i: Interface
//    ^ definition syntax src/`namespace.ts`/a/i.
//       ^^^^^^^^^ reference syntax src/`namespace.ts`/a/Interface#
  export const value = 1
//             ^^^^^ definition syntax src/`namespace.ts`/a/value.
}

