// < definition syntax src/`structural-type.ts`/

export function foo(): Promise<{ member: number }> {
//              ^^^ definition syntax src/`structural-type.ts`/foo().
//                     ^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2015.iterable.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/Promise.
//                     ^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2018.promise.d.ts`/Promise#
//                               ^^^^^^ definition syntax src/`structural-type.ts`/foo().Promise:typeLiteral0:member.
  return Promise.resolve({ member: 42 })
//       ^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#
//       ^^^^^^^ reference typescript lib/`lib.es2015.iterable.d.ts`/Promise#
//       ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/Promise.
//       ^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Promise#
//       ^^^^^^^ reference typescript lib/`lib.es2018.promise.d.ts`/Promise#
//               ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/PromiseConstructor#resolve().
//                         ^^^^^^ reference syntax src/`structural-type.ts`/member0:
}
export function bar(): Promise<number> {
//              ^^^ definition syntax src/`structural-type.ts`/bar().
//                     ^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2015.iterable.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/Promise.
//                     ^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Promise#
//                     ^^^^^^^ reference typescript lib/`lib.es2018.promise.d.ts`/Promise#
  return foo().then(x => x.member)
//       ^^^ reference syntax src/`structural-type.ts`/foo().
//             ^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#then().
//                  ^ definition local 4
//                       ^ reference local 4
//                         ^^^^^^ reference syntax src/`structural-type.ts`/foo().Promise:typeLiteral0:member.
}
export function bar2(): Promise<number> {
//              ^^^^ definition syntax src/`structural-type.ts`/bar2().
//                      ^^^^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#
//                      ^^^^^^^ reference typescript lib/`lib.es2015.iterable.d.ts`/Promise#
//                      ^^^^^^^ reference typescript lib/`lib.es2015.promise.d.ts`/Promise.
//                      ^^^^^^^ reference typescript lib/`lib.es2015.symbol.wellknown.d.ts`/Promise#
//                      ^^^^^^^ reference typescript lib/`lib.es2018.promise.d.ts`/Promise#
  return foo().then(({ member }) => member)
//       ^^^ reference syntax src/`structural-type.ts`/foo().
//             ^^^^ reference typescript lib/`lib.es5.d.ts`/Promise#then().
//                     ^^^^^^ definition local 10
//                     ^^^^^^ reference syntax src/`structural-type.ts`/foo().Promise:typeLiteral0:member.
//                                  ^^^^^^ reference local 10
}

type OptionsFlags<Type> = { [Property in keyof Type]: boolean }
//   ^^^^^^^^^^^^ definition syntax src/`structural-type.ts`/OptionsFlags#
//                ^^^^ definition syntax src/`structural-type.ts`/OptionsFlags#[Type]
//                           ^^^^^^^^ definition local 12
//                                             ^^^^ reference syntax src/`structural-type.ts`/OptionsFlags#[Type]
type FeatureFlags = { darkMode: () => void }
//   ^^^^^^^^^^^^ definition syntax src/`structural-type.ts`/FeatureFlags#
//                    ^^^^^^^^ definition syntax src/`structural-type.ts`/FeatureFlags#typeLiteral13:darkMode.
export type FeatureOptions = OptionsFlags<FeatureFlags> // implicitly // type FeatureOptions = { // darkMode: boolean; // } const fo: FeatureOptions = { darkMode: true }; // ^ go to def
//          ^^^^^^^^^^^^^^ definition syntax src/`structural-type.ts`/FeatureOptions#
//                           ^^^^^^^^^^^^ reference syntax src/`structural-type.ts`/OptionsFlags#
//                                        ^^^^^^^^^^^^ reference syntax src/`structural-type.ts`/FeatureFlags#
export const fo: FeatureOptions = { darkMode: true }
//           ^^ definition syntax src/`structural-type.ts`/fo.
//               ^^^^^^^^^^^^^^ reference syntax src/`structural-type.ts`/FeatureOptions#
//                                  ^^^^^^^^ reference syntax src/`structural-type.ts`/FeatureFlags#typeLiteral13:darkMode.

