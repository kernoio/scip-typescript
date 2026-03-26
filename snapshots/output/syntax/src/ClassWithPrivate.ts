// < definition syntax src/`ClassWithPrivate.ts`/

export class ClassWithPrivate {
//           ^^^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#
  #privateField
//^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateField`.
  #privateFieldWithInitializer = 42
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateFieldWithInitializer`.

  #privateMethod() {
//^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateMethod`().
    this.#privateField = 'private field'
//       ^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateField`.
    return this.#privateField
//              ^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateField`.
  }

  static #privateStaticField
//       ^^^^^^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticField`.
  static #privateStaticFieldWithInitializer = 42
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticFieldWithInitializer`.

  static #privateStaticMethod() {}
//       ^^^^^^^^^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticMethod`().
  public publicMethod(): any[] {
//       ^^^^^^^^^^^^ definition syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#publicMethod().
    return [
      this.#privateField,
//         ^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateField`.
      this.#privateFieldWithInitializer,
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateFieldWithInitializer`.
      this.#privateMethod(),
//         ^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateMethod`().
      ClassWithPrivate.#privateStaticMethod(),
//    ^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#
//                     ^^^^^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticMethod`().
      ClassWithPrivate.#privateStaticField,
//    ^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#
//                     ^^^^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticField`.
      ClassWithPrivate.#privateStaticFieldWithInitializer,
//    ^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#
//                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ reference syntax src/`ClassWithPrivate.ts`/ClassWithPrivate#`#privateStaticFieldWithInitializer`.
    ]
  }
}

