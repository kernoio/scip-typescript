// < definition syntax src/`decorators.ts`/

import { Configuration } from './reusable-types'
//       ^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Configuration#
//                            ^^^^^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/

function MyDecorator(value: Configuration) {
//       ^^^^^^^^^^^ definition syntax src/`decorators.ts`/MyDecorator().
//                   ^^^^^ definition syntax src/`decorators.ts`/MyDecorator().(value)
//                          ^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/Configuration#
  return function (target: Function) {
//                 ^^^^^^ definition local 2
//                         ^^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Function#
//                         ^^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Function.
//                         ^^^^^^^^ reference typescript lib/`lib.es2015.core.d.ts`/Function#
//                         ^^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Function#
    console.log(`MyDecorator is called with value: ${value}`)
//  ^^^^^^^ reference typescript lib/`lib.dom.d.ts`/console.
//  ^^^^^^^ reference @types/node `globals.d.ts`/global/console.
//  ^^^^^^^ reference node:console global/console/
//  ^^^^^^^ reference node:console global/console.
//          ^^^ reference typescript lib/`lib.dom.d.ts`/Console#log().
//          ^^^ reference node:console global/Console#log().
//                                                   ^^^^^ reference syntax src/`decorators.ts`/MyDecorator().(value)
  }
}

@MyDecorator({ property: 42, property2: '42' })
//^^^^^^^^^^^ reference syntax src/`decorators.ts`/MyDecorator().
//             ^^^^^^^^ reference syntax src/`reusable-types.ts`/Numbers#property.
//                           ^^^^^^^^^ reference syntax src/`reusable-types.ts`/Strings#property2.
class MyClass {
//    ^^^^^^^ definition syntax src/`decorators.ts`/MyClass#
  //...
}

