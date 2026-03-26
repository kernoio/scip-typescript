// < definition @example/b src/`b.ts`/

import { a } from '@example/a/src'
//       ^ reference external @example/a/src a.

export function b() {
//              ^ definition @example/b src/`b.ts`/b().
  return a()
//       ^ reference @example/a/src a.
}

