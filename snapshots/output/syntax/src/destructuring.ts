// < definition syntax src/`destructuring.ts`/

interface Props {
//        ^^^^^ definition syntax src/`destructuring.ts`/Props#
  a: number
//^ definition syntax src/`destructuring.ts`/Props#a.
}
const props: Props = { a: 42 }
//    ^^^^^ definition syntax src/`destructuring.ts`/props.
//           ^^^^^ reference syntax src/`destructuring.ts`/Props#
//                     ^ reference syntax src/`destructuring.ts`/Props#a.

export function objectDestructuring(): number[] {
//              ^^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/objectDestructuring().
  const { a: b } = props
//        ^ reference syntax src/`destructuring.ts`/Props#a.
//           ^ definition local 4
//                 ^^^^^ reference syntax src/`destructuring.ts`/props.
  return [props].map(({ a }) => a + b)
//        ^^^^^ reference syntax src/`destructuring.ts`/props.
//               ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//                      ^ definition local 10
//                      ^ reference syntax src/`destructuring.ts`/Props#a.
//                              ^ reference local 10
//                                  ^ reference local 4
}

export function arrayDestructuring(): number[] {
//              ^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/arrayDestructuring().
  const [b] = [props]
//       ^ definition local 15
//             ^^^^^ reference syntax src/`destructuring.ts`/props.
  return [[b]].map(([a]) => a.a)
//         ^ reference local 15
//             ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//                   ^ definition local 21
//                          ^ reference local 21
//                            ^ reference syntax src/`destructuring.ts`/Props#a.
}

export function nestedDestructuring(): number[] {
//              ^^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/nestedDestructuring().
  const [[b]] = [[props]]
//        ^ definition local 28
//                ^^^^^ reference syntax src/`destructuring.ts`/props.
  return [[props]].map(([{ a }]) => a + b.a)
//         ^^^^^ reference syntax src/`destructuring.ts`/props.
//                 ^^^ reference typescript lib/`lib.es5.d.ts`/Array#map().
//                         ^ definition local 36
//                         ^ reference syntax src/`destructuring.ts`/Props#a.
//                                  ^ reference local 36
//                                      ^ reference local 28
//                                        ^ reference syntax src/`destructuring.ts`/Props#a.
}

export function forLoopObjectDestructuring(): number {
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/forLoopObjectDestructuring().
  for (const { a } of [props]) {
//             ^ definition local 41
//             ^ reference syntax src/`destructuring.ts`/Props#a.
//                     ^^^^^ reference syntax src/`destructuring.ts`/props.
    return a
//         ^ reference local 41
  }
  return 1
}

export function forLoopArrayDestructuring(): number {
//              ^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/forLoopArrayDestructuring().
  for (const [{ a }] of [[props]]) {
//              ^ definition local 48
//              ^ reference syntax src/`destructuring.ts`/Props#a.
//                        ^^^^^ reference syntax src/`destructuring.ts`/props.
    return a
//         ^ reference local 48
  }
  return 1
}

export function parameterDestructuring({ a }: Props): number {
//              ^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`destructuring.ts`/parameterDestructuring().
//                                       ^ definition local 50
//                                       ^ reference syntax src/`destructuring.ts`/Props#a.
//                                            ^^^^^ reference syntax src/`destructuring.ts`/Props#
  return a
//       ^ reference local 50
}

