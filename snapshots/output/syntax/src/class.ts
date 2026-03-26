// < definition syntax src/`class.ts`/

export class Class {
//           ^^^^^ definition syntax src/`class.ts`/Class#
  public classProperty: string
//       ^^^^^^^^^^^^^ definition syntax src/`class.ts`/Class#classProperty.
  constructor(constructorParam: string) {
//^^^^^^^^^^^ definition syntax src/`class.ts`/Class#`<constructor>`().
//            ^^^^^^^^^^^^^^^^ definition syntax src/`class.ts`/Class#`<constructor>`().(constructorParam)
    this.classProperty = constructorParam
//       ^^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#classProperty.
//                       ^^^^^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#`<constructor>`().(constructorParam)
  }
  public method(methodParam: string): string {
//       ^^^^^^ definition syntax src/`class.ts`/Class#method().
//              ^^^^^^^^^^^ definition syntax src/`class.ts`/Class#method().(methodParam)
    return this.privateMethod(methodParam)
//              ^^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#privateMethod().
//                            ^^^^^^^^^^^ reference syntax src/`class.ts`/Class#method().(methodParam)
  }
  public static staticMethod(methodParam: string): string {
//              ^^^^^^^^^^^^ definition syntax src/`class.ts`/Class#staticMethod().
//                           ^^^^^^^^^^^ definition syntax src/`class.ts`/Class#staticMethod().(methodParam)
    return methodParam
//         ^^^^^^^^^^^ reference syntax src/`class.ts`/Class#staticMethod().(methodParam)
  }
  private privateMethod(methodParam: string): string {
//        ^^^^^^^^^^^^^ definition syntax src/`class.ts`/Class#privateMethod().
//                      ^^^^^^^^^^^ definition syntax src/`class.ts`/Class#privateMethod().(methodParam)
    return methodParam
//         ^^^^^^^^^^^ reference syntax src/`class.ts`/Class#privateMethod().(methodParam)
  }
}

export function newClass(param: string): string {
//              ^^^^^^^^ definition syntax src/`class.ts`/newClass().
//                       ^^^^^ definition syntax src/`class.ts`/newClass().(param)
  const instance = new Class(param).classProperty
//      ^^^^^^^^ definition local 2
//                     ^^^^^ reference syntax src/`class.ts`/Class#`<constructor>`().
//                           ^^^^^ reference syntax src/`class.ts`/newClass().(param)
//                                  ^^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#classProperty.
  const instance2 = Class.staticMethod(param)
//      ^^^^^^^^^ definition local 5
//                  ^^^^^ reference syntax src/`class.ts`/Class#
//                        ^^^^^^^^^^^^ reference syntax src/`class.ts`/Class#staticMethod().
//                                     ^^^^^ reference syntax src/`class.ts`/newClass().(param)
  return instance + instance2
//       ^^^^^^^^ reference local 2
//                  ^^^^^^^^^ reference local 5
}

