// < definition syntax src/`enum.ts`/

export enum Enum {
//          ^^^^ definition syntax src/`enum.ts`/Enum#
  A,
//^ definition syntax src/`enum.ts`/Enum#A.
  B,
//^ definition syntax src/`enum.ts`/Enum#B.
}

export function newEnum(): Enum {
//              ^^^^^^^ definition syntax src/`enum.ts`/newEnum().
//                         ^^^^ reference syntax src/`enum.ts`/Enum#
  return Enum.A
//       ^^^^ reference syntax src/`enum.ts`/Enum#
//            ^ reference syntax src/`enum.ts`/Enum#A.
}

