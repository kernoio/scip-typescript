// < definition syntax src/`import.ts`/

import * as namespace from './namespace'
//          ^^^^^^^^^ reference syntax src/`namespace.ts`/
//                         ^^^^^^^^^^^^^ reference syntax src/`namespace.ts`/
import { Class } from './class'
//       ^^^^^ reference syntax src/`class.ts`/Class#
//                    ^^^^^^^^^ reference syntax src/`class.ts`/
import { Enum } from './enum'
//       ^^^^ reference syntax src/`enum.ts`/Enum#
//                   ^^^^^^^^ reference syntax src/`enum.ts`/
import { newFunction } from './function'
//       ^^^^^^^^^^^ reference syntax src/`function.ts`/newFunction().
//                          ^^^^^^^^^^^^ reference syntax src/`function.ts`/
import { newInterface as renamedInterface } from './interface'
//       ^^^^^^^^^^^^ reference syntax src/`interface.ts`/newInterface().
//                       ^^^^^^^^^^^^^^^^ reference syntax src/`interface.ts`/newInterface().
//                                               ^^^^^^^^^^^^^ reference syntax src/`interface.ts`/

export function useEverything(): string {
//              ^^^^^^^^^^^^^ definition syntax src/`import.ts`/useEverything().
  return (
    new Class('a').classProperty +
//      ^^^^^ reference syntax src/`class.ts`/Class#`<constructor>`().
//                 ^^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#classProperty.
    renamedInterface().methodSignature('a') +
//  ^^^^^^^^^^^^^^^^ reference syntax src/`interface.ts`/newInterface().
//                     ^^^^^^^^^^^^^^^ reference syntax src/`interface.ts`/Interface#methodSignature().
    Enum[Enum.A] +
//  ^^^^ reference syntax src/`enum.ts`/Enum#
//       ^^^^ reference syntax src/`enum.ts`/Enum#
//            ^ reference syntax src/`enum.ts`/Enum#A.
    newFunction() +
//  ^^^^^^^^^^^ reference syntax src/`function.ts`/newFunction().
    namespace.a.value
//  ^^^^^^^^^ reference syntax src/`namespace.ts`/
//            ^ reference syntax src/`namespace.ts`/a/
//              ^^^^^ reference syntax src/`namespace.ts`/a/value.
  )
}

export function dynamicImport(): Promise<void> {
//              ^^^^^^^^^^^^^ definition syntax src/`import.ts`/dynamicImport().
//                               ^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#
//                               ^^^^^^^ reference typescript lib/`lib.es2015.iterable.d.ts`/Promise#
//                               ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/Promise.
//                               ^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Promise#
//                               ^^^^^^^ reference typescript lib/`lib.es2018.promise.d.ts`/Promise#
  return import('./function').then(c => c.newFunction())
//              ^^^^^^^^^^^^ reference syntax src/`function.ts`/
//                            ^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#then().
//                                 ^ definition local 3
//                                      ^ reference local 3
//                                        ^^^^^^^^^^^ reference syntax src/`function.ts`/newFunction().
}

