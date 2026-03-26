// < definition syntax src/`object-literals-arrow-function.ts`/

import { Option } from './reusable-types'
//       ^^^^^^ reference syntax src/`reusable-types.ts`/Option#
//                     ^^^^^^^^^^^^^^^^^^ reference syntax src/`reusable-types.ts`/

interface Foobar {
//        ^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/Foobar#
  foobar: number
//^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
}

export function hasArrowFunctionParameter(
//              ^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().
  something: number,
//^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().(something)
  fn: (foobar: Foobar) => Foobar
//^^ definition syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().(fn)
//     ^^^^^^ definition local 1
//             ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
//                        ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
): Foobar {
// ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
  return fn({ foobar: 42 + something })
//       ^^ reference syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().(fn)
//            ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                         ^^^^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().(something)
}

export function consumesArrowFunction(): number {
//              ^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/consumesArrowFunction().
  return (
    hasArrowFunctionParameter(1, ({ foobar }) => ({ foobar: foobar + 1 }))
//  ^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().
//                                  ^^^^^^ definition local 10
//                                  ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                                                  ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                                                          ^^^^^^ reference local 10
      .foobar +
//     ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
    hasArrowFunctionParameter(2, foobar => ({ foobar: foobar.foobar + 2 }))
//  ^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/hasArrowFunctionParameter().
//                               ^^^^^^ definition local 14
//                                            ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                                                    ^^^^^^ reference local 14
//                                                           ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
      .foobar
//     ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
  )
}

export function genericArrow(): Foobar[] {
//              ^^^^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/genericArrow().
//                              ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
  return [1].map<Foobar>(n => ({ foobar: n + 1 }))
//           ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//               ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
//                       ^ definition local 18
//                               ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                                       ^ reference local 18
}

export function genericArrowOption(): Option<Foobar>[] {
//              ^^^^^^^^^^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/genericArrowOption().
//                                    ^^^^^^ reference syntax src/`reusable-types.ts`/Option#
//                                           ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
  return [1].map<Option<Foobar>>(n => ({ value: { foobar: n + 1 } }))
//           ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//               ^^^^^^ reference syntax src/`reusable-types.ts`/Option#
//                      ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
//                               ^ definition local 22
//                                       ^^^^^ reference syntax src/`reusable-types.ts`/Option#value.
//                                                ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#foobar.
//                                                        ^ reference local 22
}

export function genericArrow2(): Foobar[] {
//              ^^^^^^^^^^^^^ definition syntax src/`object-literals-arrow-function.ts`/genericArrow2().
//                               ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/Foobar#
  // navigation to `foobar` below does not work with tsserver or scip-java
  // because `map`  is missing an explicit `map<Foobar>` annotation.
  return [1].map(n => ({ foobar: n + 1 }))
//           ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//               ^ definition local 26
//                       ^^^^^^ reference syntax src/`object-literals-arrow-function.ts`/foobar0:
//                               ^ reference local 26
}

