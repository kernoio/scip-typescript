// < definition diagnostics `index.ts`/

/** @deprecated This class is deprecated */
class Foo {}
//    ^^^ definition diagnostics `index.ts`/Foo#

/** @deprecated This function is deprecated */
function bar() {}
//       ^^^ definition diagnostics `index.ts`/bar().

/**
 * @deprecated This is a function that has
 * multiple lines and is also deprecated. Make
 * sure to reference {@link bar} for some reason
 */
function car() {}
//       ^^^ definition diagnostics `index.ts`/car().

function main() {
//       ^^^^ definition diagnostics `index.ts`/main().
  new Foo()
//    ^^^ reference diagnostics `index.ts`/Foo#
//    diagnostic Information:
//    > This class is deprecated
  bar()
//^^^ reference diagnostics `index.ts`/bar().
//diagnostic Information:
//> This function is deprecated
  car()
//^^^ reference diagnostics `index.ts`/car().
//diagnostic Information:
//> This is a function that has
//> multiple lines and is also deprecated. Make
//> sure to reference {@link bar } for some reason
}

