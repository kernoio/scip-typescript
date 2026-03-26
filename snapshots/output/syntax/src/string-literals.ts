// < definition syntax src/`string-literals.ts`/

interface SomeInterface {
//        ^^^^^^^^^^^^^ definition syntax src/`string-literals.ts`/SomeInterface#
  a: number
//^ definition syntax src/`string-literals.ts`/SomeInterface#a.
  b: number
//^ definition syntax src/`string-literals.ts`/SomeInterface#b.
  c: number
//^ definition syntax src/`string-literals.ts`/SomeInterface#c.
}
// "Go to definition" does not work for the 'a', 'b' and 'c' string literals
// below when using tsserver so it's fine that scip-typescript does not emit
// occurrences here either.
export type OmitInterface = Omit<SomeInterface, 'a' | 'b'>
//          ^^^^^^^^^^^^^ definition syntax src/`string-literals.ts`/OmitInterface#
//                          ^^^^ reference typescript lib/`lib.es5.d.ts`/Omit#
//                               ^^^^^^^^^^^^^ reference syntax src/`string-literals.ts`/SomeInterface#
export type PickInterface = Pick<SomeInterface, 'b' | 'c'>
//          ^^^^^^^^^^^^^ definition syntax src/`string-literals.ts`/PickInterface#
//                          ^^^^ reference typescript lib/`lib.es5.d.ts`/Pick#
//                               ^^^^^^^^^^^^^ reference syntax src/`string-literals.ts`/SomeInterface#

