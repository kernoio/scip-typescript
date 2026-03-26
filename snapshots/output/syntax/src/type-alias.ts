// < definition syntax src/`type-alias.ts`/

type S = string
//   ^ definition syntax src/`type-alias.ts`/S#

const s: S = ''
//    ^ definition syntax src/`type-alias.ts`/s.
//       ^ reference syntax src/`type-alias.ts`/S#

class C<T> {
//    ^ definition syntax src/`type-alias.ts`/C#
//      ^ definition syntax src/`type-alias.ts`/C#[T]
  t: T
//^ definition syntax src/`type-alias.ts`/C#t.
//   ^ reference syntax src/`type-alias.ts`/C#[T]
}
type Cstring = C<string>
//   ^^^^^^^ definition syntax src/`type-alias.ts`/Cstring#
//             ^ reference syntax src/`type-alias.ts`/C#

const cs: Cstring = new C<string>()
//    ^^ definition syntax src/`type-alias.ts`/cs.
//        ^^^^^^^ reference syntax src/`type-alias.ts`/Cstring#
//                      ^ reference syntax src/`type-alias.ts`/C#

class D<T, U> {
//    ^ definition syntax src/`type-alias.ts`/D#
//      ^ definition syntax src/`type-alias.ts`/D#[T]
//         ^ definition syntax src/`type-alias.ts`/D#[U]
  t: T
//^ definition syntax src/`type-alias.ts`/D#t.
//   ^ reference syntax src/`type-alias.ts`/D#[T]
  u: U
//^ definition syntax src/`type-alias.ts`/D#u.
//   ^ reference syntax src/`type-alias.ts`/D#[U]
}
type DT<T> = D<T, string> // partially specialized
//   ^^ definition syntax src/`type-alias.ts`/DT#
//      ^ definition syntax src/`type-alias.ts`/DT#[T]
//           ^ reference syntax src/`type-alias.ts`/D#
//             ^ reference syntax src/`type-alias.ts`/DT#[T]
type DU<U> = D<string, DU<U>> // recursive!
//   ^^ definition syntax src/`type-alias.ts`/DU#
//      ^ definition syntax src/`type-alias.ts`/DU#[U]
//           ^ reference syntax src/`type-alias.ts`/D#
//                     ^^ reference syntax src/`type-alias.ts`/DU#
//                        ^ reference syntax src/`type-alias.ts`/DU#[U]

const dt: DT<string> = new D()
//    ^^ definition syntax src/`type-alias.ts`/dt.
//        ^^ reference syntax src/`type-alias.ts`/DT#
//                         ^ reference syntax src/`type-alias.ts`/D#
const du: DU<string> = new D()
//    ^^ definition syntax src/`type-alias.ts`/du.
//        ^^ reference syntax src/`type-alias.ts`/DU#
//                         ^ reference syntax src/`type-alias.ts`/D#

