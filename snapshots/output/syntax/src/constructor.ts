// < definition syntax src/`constructor.ts`/

namespace Yay {
//        ^^^ definition syntax src/`constructor.ts`/Yay/
  export class SuperConstructor {
//             ^^^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/Yay/SuperConstructor#
    constructor(public readonly property: number) {}
//  ^^^^^^^^^^^ definition syntax src/`constructor.ts`/Yay/SuperConstructor#`<constructor>`().
//                              ^^^^^^^^ definition syntax src/`constructor.ts`/Yay/SuperConstructor#`<constructor>`().(property)
  }

  export namespace Woo {
//                 ^^^ definition syntax src/`constructor.ts`/Yay/Woo/
    export class MyClass {
//               ^^^^^^^ definition syntax src/`constructor.ts`/Yay/Woo/MyClass#
      constructor() {}
//    ^^^^^^^^^^^ definition syntax src/`constructor.ts`/Yay/Woo/MyClass#`<constructor>`().
    }
  }
}

export class SuperConstructor2 {
//           ^^^^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/SuperConstructor2#
  constructor(public readonly property: number) {}
//^^^^^^^^^^^ definition syntax src/`constructor.ts`/SuperConstructor2#`<constructor>`().
//                            ^^^^^^^^ definition syntax src/`constructor.ts`/SuperConstructor2#`<constructor>`().(property)
}

export function useConstructor(): Yay.SuperConstructor {
//              ^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/useConstructor().
//                                ^^^ reference syntax src/`constructor.ts`/Yay/
//                                    ^^^^^^^^^^^^^^^^ reference syntax src/`constructor.ts`/Yay/SuperConstructor#
  return new Yay.SuperConstructor(10)
//           ^^^ reference syntax src/`constructor.ts`/Yay/
//               ^^^^^^^^^^^^^^^^ reference syntax src/`constructor.ts`/Yay/SuperConstructor#`<constructor>`().
}

export function useConstructor2(): SuperConstructor2 {
//              ^^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/useConstructor2().
//                                 ^^^^^^^^^^^^^^^^^ reference syntax src/`constructor.ts`/SuperConstructor2#
  return new SuperConstructor2(10)
//           ^^^^^^^^^^^^^^^^^ reference syntax src/`constructor.ts`/SuperConstructor2#`<constructor>`().
}

export function useConstructor3(): Yay.Woo.MyClass {
//              ^^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/useConstructor3().
//                                 ^^^ reference syntax src/`constructor.ts`/Yay/
//                                     ^^^ reference syntax src/`constructor.ts`/Yay/Woo/
//                                         ^^^^^^^ reference syntax src/`constructor.ts`/Yay/Woo/MyClass#
  return new Yay.Woo.MyClass()
//           ^^^ reference syntax src/`constructor.ts`/Yay/
//               ^^^ reference syntax src/`constructor.ts`/Yay/Woo/
//                   ^^^^^^^ reference syntax src/`constructor.ts`/Yay/Woo/MyClass#`<constructor>`().
}

export class NoConstructor {
//           ^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/NoConstructor#
  property: number
//^^^^^^^^ definition syntax src/`constructor.ts`/NoConstructor#property.
}

export function useNoConstructor() {
//              ^^^^^^^^^^^^^^^^ definition syntax src/`constructor.ts`/useNoConstructor().
  return new NoConstructor()
//           ^^^^^^^^^^^^^ reference syntax src/`constructor.ts`/NoConstructor#
}

