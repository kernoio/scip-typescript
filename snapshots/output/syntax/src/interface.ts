// < definition syntax src/`interface.ts`/

export interface Interface {
//               ^^^^^^^^^ definition syntax src/`interface.ts`/Interface#
  property: string
//^^^^^^^^ definition syntax src/`interface.ts`/Interface#property.
  methodSignature(param: string): string
//^^^^^^^^^^^^^^^ definition syntax src/`interface.ts`/Interface#methodSignature().
//                ^^^^^ definition syntax src/`interface.ts`/Interface#methodSignature().(param)
  methodSignature2: (param: string) => string
//^^^^^^^^^^^^^^^^ definition syntax src/`interface.ts`/Interface#methodSignature2.
//                   ^^^^^ definition local 1
}

export function newInterface(): Interface {
//              ^^^^^^^^^^^^ definition syntax src/`interface.ts`/newInterface().
//                              ^^^^^^^^^ reference syntax src/`interface.ts`/Interface#
  return {
    property: 'a',
//  ^^^^^^^^ reference syntax src/`interface.ts`/Interface#property.
    methodSignature(param: string): string {
//  ^^^^^^^^^^^^^^^ reference syntax src/`interface.ts`/Interface#methodSignature().
//                  ^^^^^ definition local 5
      return param
//           ^^^^^ reference local 5
    },
    methodSignature2: (param: string): string => {
//  ^^^^^^^^^^^^^^^^ reference syntax src/`interface.ts`/Interface#methodSignature2.
//                     ^^^^^ definition local 7
      return param
//           ^^^^^ reference local 7
    },
  }
}

